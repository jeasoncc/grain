use reqwest::{Client, StatusCode, Version};
use super::routes::build_routes;
use crate::{AppConfig, DbConnection};
use serde_json::{json, Value};
use std::sync::Arc;
use std::time::Duration;
use tokio::net::TcpListener;
use tokio::task::JoinHandle;

struct ServerTask(Option<JoinHandle<()>>);

impl Drop for ServerTask {
    fn drop(&mut self) {
        if let Some(task) = &self.0 {
            task.abort();
        }
    }
}

#[tokio::test]
async fn http_contract_uses_temporary_database_and_ephemeral_loopback_port() {
    let directory = tempfile::tempdir().unwrap();
    let config = AppConfig {
        data_dir: directory.path().to_path_buf(),
        db_filename: "http-contract.db".to_owned(),
        backup_dirname: "http-contract-backups".to_owned(),
        enable_encryption: false,
    };
    let db = Arc::new(DbConnection::connect(&config).await.unwrap());
    let routes = build_routes(db.clone(), Arc::new(config.clone()));
    let listener = TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0))
        .await
        .unwrap();
    let address = listener.local_addr().unwrap();
    let mut server = ServerTask(Some(tokio::spawn(
        warp::serve(routes).incoming(listener).run(),
    )));
    let base = format!("http://{address}");
    let client = Client::builder()
        .no_proxy()
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap();

    let health = client.get(format!("{base}/health")).send().await.unwrap();
    assert_eq!(health.status(), StatusCode::OK);
    assert_eq!(health.version(), Version::HTTP_11);
    assert_eq!(health.json::<Value>().await.unwrap(), json!({"status": "ok"}));

    let http2 = Client::builder()
        .no_proxy()
        .http2_prior_knowledge()
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap();
    let health = http2.get(format!("{base}/health")).send().await.unwrap();
    assert_eq!(health.status(), StatusCode::OK);
    assert_eq!(health.version(), Version::HTTP_2);
    assert_eq!(health.json::<Value>().await.unwrap(), json!({"status": "ok"}));

    let created = client
        .post(format!("{base}/api/workspaces"))
        .json(&json!({"title": "HTTP dependency migration"}))
        .send()
        .await
        .unwrap();
    assert_eq!(created.status(), StatusCode::OK);
    let created: Value = created.json().await.unwrap();
    let id = created["id"].as_str().unwrap();
    assert_eq!(created["title"], "HTTP dependency migration");
    let fetched: Value = client
        .get(format!("{base}/api/workspaces/{id}"))
        .send()
        .await
        .unwrap()
        .error_for_status()
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(fetched, created);

    let malformed = client
        .post(format!("{base}/api/workspaces"))
        .header("content-type", "application/json")
        .body("{")
        .send()
        .await
        .unwrap();
    assert_eq!(malformed.status(), StatusCode::BAD_REQUEST);
    assert_eq!(malformed.json::<Value>().await.unwrap()["error"]["code"], "INVALID_JSON");
    let missing = client.get(format!("{base}/not-an-api-route")).send().await.unwrap();
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
    let method = client.put(format!("{base}/health")).send().await.unwrap();
    assert_eq!(method.status(), StatusCode::METHOD_NOT_ALLOWED);
    let preflight = client
        .request(reqwest::Method::OPTIONS, format!("{base}/api/workspaces"))
        .header("origin", "https://grain-smoke.example")
        .header("access-control-request-method", "POST")
        .header("access-control-request-headers", "content-type")
        .send()
        .await
        .unwrap();
    assert!(preflight.status().is_success());
    assert!(preflight.headers().contains_key("access-control-allow-origin"));

    let backup = client
        .post(format!("{base}/api/backups"))
        .send()
        .await
        .unwrap()
        .error_for_status()
        .unwrap()
        .json::<Value>()
        .await
        .unwrap();
    let filename = backup["filename"].as_str().unwrap();
    assert!(config.backup_dir().join(filename).is_file());
    let listed = client
        .get(format!("{base}/api/backups"))
        .send()
        .await
        .unwrap()
        .error_for_status()
        .unwrap()
        .json::<Value>()
        .await
        .unwrap();
    assert!(listed.as_array().unwrap().iter().any(|item| item["filename"] == filename));
    client
        .delete(format!("{base}/api/backups/{filename}"))
        .send()
        .await
        .unwrap()
        .error_for_status()
        .unwrap();
    assert!(!config.backup_dir().join(filename).exists());
    client
        .delete(format!("{base}/api/workspaces/{id}"))
        .send()
        .await
        .unwrap()
        .error_for_status()
        .unwrap();
    let deleted = client.get(format!("{base}/api/workspaces/{id}")).send().await.unwrap();
    assert_eq!(deleted.status(), StatusCode::OK);
    assert_eq!(deleted.json::<Value>().await.unwrap(), Value::Null);

    let task = server.0.take().unwrap();
    task.abort();
    let _ = task.await;
    db.close_by_ref().await.unwrap();
}
