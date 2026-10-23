// Curated list of common binaries on openSUSE / SUSE Linux Enterprise.
// Paths verified on openSUSE Leap 16.0. Each entry is the real /usr/bin path.
// Users can also type a custom path — these are just shortcuts.

export interface BinaryOption {
  label: string;       // friendly name
  path: string;        // full path
  category: string;    // grouping
}

export const SUSE_BINARIES: BinaryOption[] = [
  // Network / HTTP
  { label: 'curl', path: '/usr/bin/curl', category: 'Network' },
  { label: 'wget', path: '/usr/bin/wget', category: 'Network' },
  { label: 'ssh', path: '/usr/bin/ssh', category: 'Network' },
  { label: 'scp', path: '/usr/bin/scp', category: 'Network' },
  { label: 'rsync', path: '/usr/bin/rsync', category: 'Network' },
  { label: 'nc (netcat)', path: '/usr/bin/nc', category: 'Network' },
  { label: 'nmap', path: '/usr/bin/nmap', category: 'Network' },
  { label: 'openssl', path: '/usr/bin/openssl', category: 'Network' },

  // Git / DevOps
  { label: 'git', path: '/usr/bin/git', category: 'Git & DevOps' },
  { label: 'gh (GitHub CLI)', path: '/usr/bin/gh', category: 'Git & DevOps' },
  { label: 'helm', path: '/usr/bin/helm', category: 'Git & DevOps' },
  { label: 'kubectl', path: '/usr/bin/kubectl', category: 'Git & DevOps' },
  { label: 'docker', path: '/usr/bin/docker', category: 'Git & DevOps' },
  { label: 'podman', path: '/usr/bin/podman', category: 'Git & DevOps' },

  // Python
  { label: 'python3', path: '/usr/bin/python3', category: 'Python' },
  { label: 'python3.12', path: '/usr/bin/python3.12', category: 'Python' },
  { label: 'pip', path: '/usr/bin/pip', category: 'Python' },
  { label: 'pip3', path: '/usr/bin/pip3', category: 'Python' },
  { label: 'uv', path: '/usr/bin/uv', category: 'Python' },

  // Node.js
  { label: 'node', path: '/usr/bin/node', category: 'Node.js' },
  { label: 'npm', path: '/usr/bin/npm', category: 'Node.js' },
  { label: 'npx', path: '/usr/bin/npx', category: 'Node.js' },
  { label: 'pnpm', path: '/usr/bin/pnpm', category: 'Node.js' },
  { label: 'yarn', path: '/usr/bin/yarn', category: 'Node.js' },

  // Shells
  { label: 'bash', path: '/usr/bin/bash', category: 'Shells' },
  { label: 'sh', path: '/usr/bin/sh', category: 'Shells' },
  { label: 'zsh', path: '/usr/bin/zsh', category: 'Shells' },

  // Package managers
  { label: 'zypper', path: '/usr/bin/zypper', category: 'Package Managers' },
  { label: 'rpm', path: '/usr/bin/rpm', category: 'Package Managers' },

  // Build tools
  { label: 'make', path: '/usr/bin/make', category: 'Build Tools' },
  { label: 'gcc', path: '/usr/bin/gcc', category: 'Build Tools' },
  { label: 'g++', path: '/usr/bin/g++', category: 'Build Tools' },
  { label: 'cmake', path: '/usr/bin/cmake', category: 'Build Tools' },

  // Archive / file
  { label: 'tar', path: '/usr/bin/tar', category: 'File Utils' },
  { label: 'gzip', path: '/usr/bin/gzip', category: 'File Utils' },
  { label: 'bzip2', path: '/usr/bin/bzip2', category: 'File Utils' },
  { label: 'unzip', path: '/usr/bin/unzip', category: 'File Utils' },

  // AI / Agent tools (commonly /usr/local/bin)
  { label: 'claude', path: '/usr/local/bin/claude', category: 'AI Agents' },
  { label: 'codex', path: '/usr/local/bin/codex', category: 'AI Agents' },
  { label: 'opencode', path: '/usr/local/bin/opencode', category: 'AI Agents' },

  // JVM
  { label: 'java', path: '/usr/bin/java', category: 'JVM' },
  { label: 'javac', path: '/usr/bin/javac', category: 'JVM' },

  // Other languages
  { label: 'go', path: '/usr/bin/go', category: 'Other Languages' },
  { label: 'cargo', path: '/usr/bin/cargo', category: 'Other Languages' },
  { label: 'rustc', path: '/usr/bin/rustc', category: 'Other Languages' },
  { label: 'ruby', path: '/usr/bin/ruby', category: 'Other Languages' },
];

// Group by category for the dropdown
export const BINARY_CATEGORIES: string[] = [...new Set(SUSE_BINARIES.map((b) => b.category))];
