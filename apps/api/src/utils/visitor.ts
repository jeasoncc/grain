// 工具函数：解析用户代理
export function parseUserAgent(userAgent: string): {
  browser: string;
  os: string;
  device: string;
} {
  const ua = userAgent || '';
  
  return {
    browser: ua.includes('Chrome') ? 'Chrome' :
             ua.includes('Firefox') ? 'Firefox' :
             ua.includes('Safari') ? 'Safari' :
             ua.includes('Edge') ? 'Edge' : 'Unknown',
    os: ua.includes('Windows') ? 'Windows' :
        ua.includes('Mac') ? 'macOS' :
        ua.includes('Linux') ? 'Linux' :
        ua.includes('Android') ? 'Android' :
        ua.includes('iOS') ? 'iOS' : 'Unknown',
    device: ua.includes('Mobile') ? 'Mobile' : 'Desktop',
  };
}

// 获取客户端 IP
export function getClientIP(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

