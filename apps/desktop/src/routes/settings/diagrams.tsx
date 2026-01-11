import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useDiagramSettings } from "@/state/diagram.state";
import { Button } from "@/views/ui/button";
import { Input } from "@/views/ui/input";
import { Label } from "@/views/ui/label";
import { Switch } from "@/views/ui/switch";

export const Route = createFileRoute("/settings/diagrams")({
	component: DiagramSettings,
});

function DiagramSettings() {
	const {
		krokiServerUrl,
		enableKroki,
		setKrokiServerUrl,
		setEnableKroki,
		testKrokiConnection,
	} = useDiagramSettings();

	const [testUrl, setTestUrl] = useState(krokiServerUrl);
	const [testing, setTesting] = useState(false);
	const [testResult, setTestResult] = useState<boolean | null>(null);

	const handleTest = async () => {
		if (!testUrl.trim()) {
			toast.error("Please enter a Kroki server URL");
			return;
		}

		setTesting(true);
		setTestResult(null);

		// Temporary URL for testing
		const originalUrl = krokiServerUrl;
		setKrokiServerUrl(testUrl);

		const success = await testKrokiConnection();
		setTestResult(success);

		if (success) {
			toast.success("Connection successful!");
		} else {
			toast.error("Connection failed. Please check the URL.");
			// Revert URL
			setKrokiServerUrl(originalUrl);
			setTestUrl(originalUrl);
		}

		setTesting(false);
	};

	const handleSave = () => {
		setKrokiServerUrl(testUrl);
		toast.success("Settings saved");
	};

	const handleEnableToggle = (checked: boolean) => {
		setEnableKroki(checked);
		if (checked && !krokiServerUrl) {
			// If enabling and no URL set, suggest the official one
			setTestUrl("https://kroki.io");
		}
		toast.success(
			checked ? "PlantUML support enabled" : "PlantUML support disabled",
		);
	};

	return (
		<div className="space-y-10 max-w-3xl">
			<div>
				<h3 className="text-lg font-medium">Diagrams</h3>
				<p className="text-sm text-muted-foreground">
					Configure diagram rendering services for Mermaid and PlantUML.
				</p>
			</div>

			<div className="space-y-12">
				{/* Mermaid Section */}
				<div className="space-y-4">
					<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Mermaid
					</h4>
					<div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border border-dashed">
						<CheckCircle2 className="h-4 w-4 text-green-500" />
						<span>Mermaid is enabled by default (client-side rendering).</span>
					</div>
				</div>

				{/* PlantUML Section */}
				<div className="space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
								PlantUML (Kroki)
							</h4>
							<p className="text-xs text-muted-foreground">
								Render PlantUML diagrams via a Kroki server.
							</p>
						</div>
						<Switch
							checked={enableKroki}
							onCheckedChange={handleEnableToggle}
						/>
					</div>

					{enableKroki && (
						<div className="space-y-6 pl-4 border-l-2 border-muted ml-1">
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="kroki-url">Server URL</Label>
									<div className="flex gap-2">
										<Input
											id="kroki-url"
											type="url"
											placeholder="https://kroki.io"
											value={testUrl}
											onChange={(e) => {
												setTestUrl(e.target.value);
												setTestResult(null);
											}}
										/>
										<Button
											variant="outline"
											onClick={handleTest}
											disabled={testing || !testUrl.trim()}
										>
											{testing ? (
												<>
													<Loader2 className="h-4 w-4 mr-2 animate-spin" />
													Testing
												</>
											) : (
												"Test"
											)}
										</Button>
									</div>

									{/* Test Result */}
									{testResult !== null && (
										<div className="flex items-center gap-2 text-sm pt-1">
											{testResult ? (
												<>
													<CheckCircle2 className="h-4 w-4 text-green-500" />
													<span className="text-green-600">
														Connected successfully
													</span>
												</>
											) : (
												<>
													<XCircle className="h-4 w-4 text-red-500" />
													<span className="text-red-600">
														Connection failed
													</span>
												</>
											)}
										</div>
									)}

									<p className="text-xs text-muted-foreground">
										Recommended: Official service (https://kroki.io) or
										self-hosted instance.
									</p>
								</div>

								<div className="flex gap-2">
									<Button
										onClick={handleSave}
										disabled={testUrl === krokiServerUrl}
										size="sm"
									>
										Save Changes
									</Button>
									<Button
										variant="ghost"
										onClick={() => setTestUrl(krokiServerUrl)}
										disabled={testUrl === krokiServerUrl}
										size="sm"
									>
										Reset
									</Button>
								</div>
							</div>

							<div className="space-y-2 text-sm text-muted-foreground pt-2">
								<p>
									Kroki is an open-source diagram rendering service supporting
									PlantUML, Mermaid, and more.
								</p>
								<div className="flex gap-4 text-xs">
									<a
										href="https://kroki.io"
										target="_blank"
										rel="noopener noreferrer"
										className="text-primary hover:underline flex items-center gap-1"
									>
										Official Service
										<ExternalLink className="h-3 w-3" />
									</a>
									<a
										href="https://docs.kroki.io/kroki/setup/install/"
										target="_blank"
										rel="noopener noreferrer"
										className="text-primary hover:underline flex items-center gap-1"
									>
										Self-hosting Guide
										<ExternalLink className="h-3 w-3" />
									</a>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
