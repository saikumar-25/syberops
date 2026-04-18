import { Alert, Asset, IOC, MitreTechnique, Severity, AlertStatus, Verdict } from '../types';

interface AlertScenario {
  source: string;
  icon: string;
  title: string;
  description: string;
  severity: Severity;
  mitre: MitreTechnique[];
  assetTypes: Array<'host' | 'user' | 'ip' | 'domain' | 'process' | 'file'>;
  iocTypes: Array<'ip' | 'domain' | 'hash' | 'email' | 'url' | 'file'>;
  truePositiveRate: number;
}

const ALERT_SCENARIOS: AlertScenario[] = [
  {
    source: 'CrowdStrike Falcon',
    icon: '🦅',
    title: 'Mimikatz credential dumping detected',
    description: 'Process lsass.exe was accessed by suspicious process mimikatz.exe attempting to dump credentials',
    severity: 'critical',
    mitre: [{ id: 'T1003.001', name: 'LSASS Memory', tactic: 'Credential Access' }],
    assetTypes: ['host', 'user', 'process'],
    iocTypes: ['hash', 'ip'],
    truePositiveRate: 0.92,
  },
  {
    source: 'Splunk SIEM',
    icon: '🔍',
    title: 'Brute force attack - 847 failed attempts in 2 minutes',
    description: 'Excessive authentication failures detected from single source IP address',
    severity: 'high',
    mitre: [{ id: 'T1110', name: 'Brute Force', tactic: 'Credential Access' }],
    assetTypes: ['ip', 'user'],
    iocTypes: ['ip'],
    truePositiveRate: 0.65,
  },
  {
    source: 'Microsoft Sentinel',
    icon: '☁️',
    title: 'Impossible travel - login from 2 countries in 10 minutes',
    description: 'User logged in from New York then Moscow within 10 minute window',
    severity: 'high',
    mitre: [{ id: 'T1078', name: 'Valid Accounts', tactic: 'Defense Evasion' }],
    assetTypes: ['user', 'ip'],
    iocTypes: ['ip'],
    truePositiveRate: 0.45,
  },
  {
    source: 'Palo Alto Networks',
    icon: '🔥',
    title: 'C2 beacon - periodic outbound connection every 10 minutes',
    description: 'Regular periodic outbound connection to known command and control infrastructure',
    severity: 'critical',
    mitre: [{ id: 'T1071.001', name: 'Web Protocols', tactic: 'Command and Control' }],
    assetTypes: ['host', 'domain', 'ip'],
    iocTypes: ['ip', 'domain'],
    truePositiveRate: 0.88,
  },
  {
    source: 'Okta',
    icon: '🔑',
    title: 'MFA bypass attempt detected',
    description: 'Authentication succeeded after multiple MFA failures from same session',
    severity: 'high',
    mitre: [{ id: 'T1078', name: 'Valid Accounts', tactic: 'Initial Access' }],
    assetTypes: ['user', 'ip'],
    iocTypes: ['ip'],
    truePositiveRate: 0.78,
  },
  {
    source: 'CrowdStrike Falcon',
    icon: '🦅',
    title: 'Ransomware behavior - mass file encryption detected',
    description: 'Process encrypting large number of files in rapid succession with suspicious extension changes',
    severity: 'critical',
    mitre: [{ id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact' }],
    assetTypes: ['host', 'process', 'file'],
    iocTypes: ['hash'],
    truePositiveRate: 0.95,
  },
  {
    source: 'AWS GuardDuty',
    icon: '☁️',
    title: 'Cryptomining activity detected on EC2 instance',
    description: 'EC2 instance communicating with known cryptomining pool with high data transfer',
    severity: 'medium',
    mitre: [{ id: 'T1496', name: 'Resource Hijacking', tactic: 'Impact' }],
    assetTypes: ['host', 'domain', 'ip'],
    iocTypes: ['ip', 'domain'],
    truePositiveRate: 0.82,
  },
  {
    source: 'Elastic SIEM',
    icon: '📊',
    title: 'Lateral movement - WMI remote execution',
    description: 'WMI used to execute commands on remote hosts within corporate network',
    severity: 'high',
    mitre: [{ id: 'T1021.006', name: 'Windows Remote Management', tactic: 'Lateral Movement' }],
    assetTypes: ['host', 'user'],
    iocTypes: ['ip'],
    truePositiveRate: 0.70,
  },
  {
    source: 'Proofpoint',
    icon: '📧',
    title: 'Spearphishing email with malicious attachment',
    description: 'Email with macro-enabled document targeting executive team members',
    severity: 'high',
    mitre: [{ id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'Initial Access' }],
    assetTypes: ['user', 'ip'],
    iocTypes: ['email', 'hash', 'url'],
    truePositiveRate: 0.60,
  },
  {
    source: 'CyberArk',
    icon: '🗝️',
    title: 'Privileged account accessed outside business hours',
    description: 'Domain admin account used at 2:47 AM on Saturday from non-standard location',
    severity: 'medium',
    mitre: [{ id: 'T1078.002', name: 'Domain Accounts', tactic: 'Privilege Escalation' }],
    assetTypes: ['user', 'ip'],
    iocTypes: ['ip'],
    truePositiveRate: 0.35,
  },
];

const HOSTNAMES = [
  'WIN-CORP-042',
  'WIN-CORP-128',
  'PROD-DB-01',
  'PROD-WEB-03',
  'MAIL-EXCH-01',
  'DC-PRIMARY-01',
  'DC-SECONDARY-02',
  'FILESERVER-NAS-01',
];

const USERNAMES = [
  'john.smith',
  'sarah.jones',
  'admin.account',
  'service.acct',
  'james.wilson',
  'michael.brown',
  'exec.director',
];

const IP_ADDRESSES = [
  '192.168.1.105',
  '192.168.1.247',
  '10.0.1.50',
  '10.0.2.88',
  '185.220.101.45',
  '162.125.18.232',
  '103.145.45.98',
];

const DOMAINS = [
  'evil.com',
  'malicious.net',
  'c2server.ru',
  'phishing.io',
];

const FILE_HASHES = [
  'a4c84cc1f8d18ee0a50a8649c3c2f0def16b5251',
  'f7e84c1c4f8f3e4e1c0c9b8a7d6e5f4a3b2c1d0e',
  'e3d2c1b0a9f8e7d6c5b4a3928170605f4e3d2c1b',
];

const PROCESS_NAMES = [
  'mimikatz.exe',
  'psexec.exe',
  'certutil.exe',
  'powershell.exe',
  'cmd.exe',
  'rundll32.exe',
  'svchost.exe',
];

const EMAIL_ADDRESSES = [
  'attacker@gmail.com',
  'phishing@malicious.com',
  'spam@test.io',
];

export class AlertSimulator {
  private counter = 0;

  generateAlert(tenantId: string = 'tenant-1'): Alert {
    this.counter++;
    const scenario = ALERT_SCENARIOS[Math.floor(Math.random() * ALERT_SCENARIOS.length)];
    const now = new Date();
    const timestamp = new Date(now.getTime() - Math.random() * 3600000).toISOString();

    const assets = this.generateAssets(scenario);
    const iocs = this.generateIOCs(scenario);

    const alert: Alert = {
      id: `ALT-${4821 + this.counter}`,
      timestamp,
      source: scenario.source,
      sourceIcon: scenario.icon,
      title: scenario.title,
      description: scenario.description,
      severity: scenario.severity,
      status: 'new',
      verdict: 'pending',
      confidence: 0,
      tenantId,
      affectedAssets: assets,
      iocs,
      mitreTechniques: scenario.mitre,
      agentSteps: [],
      responseActions: [],
      rawPayload: this.generateRawPayload(scenario, assets, iocs),
    };

    return alert;
  }

  generateInitialAlerts(count: number): Alert[] {
    const alerts: Alert[] = [];

    for (let i = 0; i < count; i++) {
      const alert = this.generateAlert('tenant-1');

      const statuses: AlertStatus[] = ['new', 'triaging', 'triaged', 'escalated', 'closed'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      alert.status = randomStatus;

      if (randomStatus === 'triaged' || randomStatus === 'escalated' || randomStatus === 'closed') {
        const verdicts: Verdict[] = ['true_positive', 'false_positive', 'suspicious'];
        alert.verdict = verdicts[Math.floor(Math.random() * verdicts.length)];
        alert.confidence = 60 + Math.random() * 40;
        // Fix: triageStartedAt must be AFTER timestamp, triageCompletedAt after triageStartedAt
        const alertTime = new Date(alert.timestamp).getTime();
        const triageStartDelay = 5000 + Math.random() * 25000; // 5–30s after alert
        const triageDuration = 8000 + Math.random() * 22000;   // 8–30s triage time
        alert.triageStartedAt = new Date(alertTime + triageStartDelay).toISOString();
        alert.triageCompletedAt = new Date(alertTime + triageStartDelay + triageDuration).toISOString();
        // Assign some alerts to incidents for correlation view
        if (Math.random() < 0.3) {
          const incidentNum = Math.floor(Math.random() * 5) + 1;
          alert.incidentId = `INC-2026-${String(incidentNum).padStart(4, '0')}`;
        }
      }

      alerts.push(alert);
    }

    return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private generateAssets(scenario: AlertScenario): Asset[] {
    const assets: Asset[] = [];
    const assetTypes = scenario.assetTypes;

    if (assetTypes.includes('host')) {
      const hostname = HOSTNAMES[Math.floor(Math.random() * HOSTNAMES.length)];
      assets.push({
        id: `host-${hostname}`,
        type: 'host',
        value: hostname,
        label: hostname,
        riskLevel: scenario.severity === 'critical' ? 'critical' : 'high',
        context: 'Windows Domain Member',
      });
    }

    if (assetTypes.includes('user')) {
      const username = USERNAMES[Math.floor(Math.random() * USERNAMES.length)];
      assets.push({
        id: `user-${username}`,
        type: 'user',
        value: username,
        label: username,
        riskLevel: 'high',
        context: 'Domain User',
      });
    }

    if (assetTypes.includes('ip')) {
      const ip = IP_ADDRESSES[Math.floor(Math.random() * IP_ADDRESSES.length)];
      assets.push({
        id: `ip-${ip}`,
        type: 'ip',
        value: ip,
        label: ip,
        riskLevel: 'critical',
        context: 'External IP',
      });
    }

    if (assetTypes.includes('domain')) {
      const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
      assets.push({
        id: `domain-${domain}`,
        type: 'domain',
        value: domain,
        label: domain,
        riskLevel: 'critical',
      });
    }

    if (assetTypes.includes('process')) {
      const process = PROCESS_NAMES[Math.floor(Math.random() * PROCESS_NAMES.length)];
      assets.push({
        id: `process-${process}`,
        type: 'process',
        value: process,
        label: process,
        riskLevel: 'critical',
        context: 'PID: 1284',
      });
    }

    if (assetTypes.includes('file')) {
      const hash = FILE_HASHES[Math.floor(Math.random() * FILE_HASHES.length)];
      assets.push({
        id: `file-${hash}`,
        type: 'file',
        value: hash,
        label: `${hash.substring(0, 16)}...`,
        riskLevel: 'critical',
        context: 'SHA1 Hash',
      });
    }

    return assets;
  }

  private generateIOCs(scenario: AlertScenario): IOC[] {
    const iocs: IOC[] = [];
    const iocTypes = scenario.iocTypes;

    if (iocTypes.includes('ip')) {
      const ip = IP_ADDRESSES[Math.floor(Math.random() * IP_ADDRESSES.length)];
      iocs.push({
        type: 'ip',
        value: ip,
        malicious: Math.random() > 0.3,
        confidence: 75 + Math.random() * 25,
        source: Math.random() > 0.5 ? 'VirusTotal' : 'AbuseIPDB',
        tags: ['malware', 'botnet', 'c2'],
      });
    }

    if (iocTypes.includes('domain')) {
      const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
      iocs.push({
        type: 'domain',
        value: domain,
        malicious: true,
        confidence: 90 + Math.random() * 10,
        source: 'VirusTotal',
        tags: ['phishing', 'malware', 'c2'],
      });
    }

    if (iocTypes.includes('hash')) {
      const hash = FILE_HASHES[Math.floor(Math.random() * FILE_HASHES.length)];
      iocs.push({
        type: 'hash',
        value: hash,
        malicious: Math.random() > 0.2,
        confidence: 85 + Math.random() * 15,
        source: 'VirusTotal',
        tags: ['mimikatz', 'credential-dumper'],
      });
    }

    if (iocTypes.includes('email')) {
      const email = EMAIL_ADDRESSES[Math.floor(Math.random() * EMAIL_ADDRESSES.length)];
      iocs.push({
        type: 'email',
        value: email,
        malicious: true,
        confidence: 95,
        source: 'Proofpoint',
        tags: ['spearphishing', 'phishing'],
      });
    }

    if (iocTypes.includes('url')) {
      iocs.push({
        type: 'url',
        value: 'http://malicious.net/payload.exe',
        malicious: true,
        confidence: 92,
        source: 'URLhaus',
        tags: ['malware', 'c2'],
      });
    }

    return iocs;
  }

  private generateRawPayload(
    scenario: AlertScenario,
    assets: Asset[],
    iocs: IOC[]
  ): Record<string, unknown> {
    return {
      alert_id: `ALT-${4821 + this.counter}`,
      alert_type: scenario.title,
      severity: scenario.severity,
      source_system: scenario.source,
      timestamp: new Date().toISOString(),
      affected_hosts: assets.filter((a) => a.type === 'host').map((a) => a.value),
      affected_users: assets.filter((a) => a.type === 'user').map((a) => a.value),
      iocs_detected: iocs.map((ioc) => ({ type: ioc.type, value: ioc.value })),
      mitre_techniques: scenario.mitre,
      raw_event_data: {
        event_id: Math.floor(Math.random() * 1000000),
        process_id: Math.floor(Math.random() * 10000),
        thread_id: Math.floor(Math.random() * 50000),
        source_ip: IP_ADDRESSES[Math.floor(Math.random() * IP_ADDRESSES.length)],
        destination_ip: IP_ADDRESSES[Math.floor(Math.random() * IP_ADDRESSES.length)],
      },
    };
  }
}
