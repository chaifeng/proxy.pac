// -*- mode: javascript; js-indent-level: 2 -*-
// vim: set filetype=javascript tabstop=2 shiftwidth=2 expandtab:

const direct = "direct";
const blocked = "blocked";
const proxy = "proxy";

const DIRECT = "DIRECT";
var proxyBehaviors = {
  proxy: "SOCKS5 127.0.0.1:1080", // the default proxy
  direct: DIRECT,
  blocked: "PROXY 0.0.0.0:0",
  "http_proxy": "PROXY 127.0.0.1:3128",
  "companyProxy": "PROXY 192.168.1.1:8080", // domains list in `domain-rules-companyProxy.txt` will use this proxy setting
};
const default_behavior = DIRECT + "; " + proxyBehaviors[proxy];

const ipv4Pattern = /^\d{1,3}(\.\d{1,3}){3}$/;
const ipv6Pattern = /^[a-fA-F0-9:]+$/;
function isIpAddress(host) {
  return ipv4Pattern.test(host) || ipv6Pattern.test(host);
}

function ipToNumber(ip) {
  const parts = ip.split('.');
  return parts.reduce((acc, part) => (acc << 8) + parseInt(part, 10), 0);
}

function numberToIp(number) {
  return [
    (number >>> 24) & 0xFF,
    (number >>> 16) & 0xFF,
    (number >>> 8) & 0xFF,
    number & 0xFF
  ].join('.');
}

function ipv6ToTwoNumbers(ip) {
  const parts = ip.split(':').map(part => part ? parseInt(part, 16) : 0);
  let high = 0n, low = 0n;

  for (let i = 0; i < 4; i++) {
    high = (high << 16n) + BigInt(parts[i] || 0);
  }

  for (let i = 4; i < 8; i++) {
    low = (low << 16n) + BigInt(parts[i] || 0);
  }

  return [high, low];
}

function twoNumbersToIpv6(high, low) {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    parts.push(((high >> BigInt(48 - 16 * i)) & 0xFFFFn).toString(16));
  }
  for (let i = 0; i < 4; i++) {
    parts.push(((low >> BigInt(48 - 16 * i)) & 0xFFFFn).toString(16));
  }
  return parts.join(':').replace(/(:0{1,4}){2,}/, '::');
}

const ipv4NetworkRules = [
  [0x7F000000, 8 , direct], // 127.0.0.0/8 (Loopback)
  [0xA9FE0000, 16, direct], // 169.254.0.0/16 (Link Local)
  [0x64400000, 10, direct], // 100.64.0.0/10 (Carrier-grade NAT)
  // begin of ipv4 networks
  // end of ipv4 networks
];

const ipv6NetworkRules = [
  [0x0000000000000000n, 0x0000000000000000n, 128, direct], // ::/128 (Unspecified Address)
  [0x0000000000000000n, 0x0000000000000001n, 128, direct], // ::1/128 (Loopback Address)
  [0xfc00000000000000n, 0x0000000000000000n, 7  , direct], // fc00::/7 (Unique Local Address)
  [0xff00000000000000n, 0x0000000000000000n, 8  , direct], // ff00::/8 (Multicast Address)
  [0x2001000000000000n, 0x0000000000000000n, 16 , direct], // 2001::/16 (Teredo Address)
  [0xfe80000000000000n, 0x0000000000000000n, 10 , direct], // fe80::/10 (Link-Local Address)
  // begin of ipv6 networks
  // end of ipv6 networks
];

const proxyRules = {
  "local": direct,
  "114.114.114.114": direct,
  "whitehouse.com": blocked,
  "google": proxy,
  // begin of proxy rules
  // end of proxy rules
};

const domainRegexpRules = [
  [ /^adservice\.google\.([a-z]{2}|com?)(\.[a-z]{2})?$/, blocked], // adservice.google.com.xx
  // begin of regexp rules
  // end of regexp rules
]

class IPv4TrieNode {
  constructor() {
    this.children = [null, null]; // 0 and 1
    this.isEnd = false;
    this.network = null;
    this.prefix = null;
    this.action = direct;
  }
}

class IPv4PrefixTrie {
  constructor() {
    this.root = new IPv4TrieNode();
  }

  static buildTrieFromData(data) {
    const trie = new IPv4PrefixTrie();
    for (const [network, prefix, action] of data) {
      let node = trie.root;
      node = IPv4PrefixTrie._insertBits(node, network, prefix);
      node.isEnd = true;
      node.network = network;
      node.prefix = prefix;
      node.action = action
    }
    return trie;
  }

  static _insertBits(node, value, bits) {
    let mask = 0x80000000;
    for (let i = 0; i < bits; i++) {
      const bitIndex = ((value & mask) !== 0 ? 1 : 0);
      mask = mask >>> 1;

      if (!node.children[bitIndex]) {
        node.children[bitIndex] = new IPv4TrieNode();
      }
      node = node.children[bitIndex];
    }
    return node;
  }

  search(ip) {
    let node = this.root;
    let lastMatch = null;

    node = IPv4PrefixTrie._searchBits(node, ip, 32, (matchedNode) => {
      if (matchedNode.isEnd) {
        lastMatch = matchedNode;
      }
    });

    return lastMatch;
  }

  static _searchBits(node, value, bits, callback) {
    let mask = 0x80000000;
    for (let i = 0; i < bits; i++) {
      const bitIndex = ((value & mask) !== 0 ? 1 : 0);
      mask = mask >>> 1;

      if (!node.children[bitIndex]) {
        return null;
      }
      node = node.children[bitIndex];
      callback(node);
    }
    return node;
  }
}

class IPv6TrieNode {
  constructor() {
    this.children = [null, null]; // 0 and 1
    this.isEnd = false;
    this.networkHigh = null;
    this.networkLow = null;
    this.prefix = null;
    this.action = direct;
  }
}

class IPv6PrefixTrie {
  constructor() {
    this.root = new IPv6TrieNode();
  }

  static buildTrieFromData(data) {
    const trie = new IPv6PrefixTrie();
    for (const [networkHigh, networkLow, prefix, action] of data) {
      let node = trie.root;
      node = IPv6PrefixTrie._insertBits(node, networkHigh, Math.min(prefix, 64));
      if (prefix > 64) {
        node = IPv6PrefixTrie._insertBits(node, networkLow, prefix - 64);
      }
      node.isEnd = true;
      node.networkHigh = networkHigh;
      node.networkLow = networkLow;
      node.prefix = prefix;
      node.action = action;
    }
    return trie;
  }

  static _insertBits(node, value, bits) {
    let mask = 0x8000000000000000n;
    for (let i = 0; i < bits; i++) {
      const bitIndex = ((value & mask) !== 0n ? 1 : 0);
      mask = mask >> 1n;

      if (!node.children[bitIndex]) {
        node.children[bitIndex] = new IPv6TrieNode();
      }
      node = node.children[bitIndex];
    }
    return node;
  }

  search(ipHigh, ipLow) {
    let node = this.root;
    let lastMatch = null;

    node = IPv6PrefixTrie._searchBits(node, ipHigh, 64, (matchedNode) => {
      if (matchedNode.isEnd) {
        lastMatch = matchedNode;
      }
    });

    if (node) {
      node = IPv6PrefixTrie._searchBits(node, ipLow, 64, (matchedNode) => {
        if (matchedNode.isEnd) {
          lastMatch = matchedNode;
        }
      });
    }

    return lastMatch;
  }

  static _searchBits(node, value, bits, callback) {
    let mask = 0x8000000000000000n;
    for (let i = 0; i < bits; i++) {
      const bitIndex = ((value & mask) !== 0n ? 1 : 0);
      mask = mask >> 1n;

      if (!node.children[bitIndex]) {
        return null;
      }
      node = node.children[bitIndex];
      callback(node);
    }
    return node;
  }
}

const ipv4Trie = IPv4PrefixTrie.buildTrieFromData(ipv4NetworkRules);
const ipv6Trie = IPv6PrefixTrie.buildTrieFromData(ipv6NetworkRules);

function findMatchingNetwork(ip, networks4, networks6) {
  if (ip.includes('.')) { // IPv4
    const ipNumber = ipToNumber(ip);
    return ipv4Trie.search(ipNumber);
  } else { // IPv6
    const [ipHigh, ipLow] = ipv6ToTwoNumbers(ip);
    return ipv6Trie.search(ipHigh, ipLow);
  }
  return null;
}

function printMatchingNetwork(ip, networks4, networks6) {
  const matchedNetwork = findMatchingNetwork(ip, networks4, networks6);
  if (matchedNetwork) {
    if (ip.includes('.')) { // IPv4
      const trie = matchedNetwork;
      return `${numberToIp(trie.network)}/${trie.prefix}`;
    } else { // IPv6
      const trie = matchedNetwork;
      return `${twoNumbersToIpv6(trie.networkHigh, trie.networkLow)}/${trie.prefix}`;
    }
  } else {
    return null;
  }
}
function FindProxyForURL(_url, _host) {
  const host = _host;
  if (isIpAddress(host)) {
    const match = findMatchingNetwork(host);
    if(match) {
      return proxyBehaviors[match.action] || default_behavior;
    } else {
      var action = proxyRules[host];
      if (action !== undefined) {
        return proxyBehaviors[action] || default_behavior;
      }
      return default_behavior;
    }
  }

  const match = domainRegexpRules.find(([regexp, value]) => regexp.test(host) );
  if(match)
    return proxyBehaviors[match[1]] || default_behavior;

  var host_segment = host;
  while (true) {
    var action = proxyRules[host_segment];
    if (action !== undefined) {
      return proxyBehaviors[action] || default_behavior;
    }
    var nextDot = host_segment.indexOf(".");
    if (nextDot === -1) {
      break;
    }
    host_segment = host_segment.substring(nextDot + 1);
  }

  var remote_ip = undefined;
  if(typeof dnsResolveEx == 'function') {
    remote_ip = dnsResolveEx(host);
  } else if(typeof dnsResolve == 'function') {
    remote_ip = dnsResolve(host);
  }
  if(remote_ip !== undefined) {
    const match = findMatchingNetwork(remote_ip);
    if (match) return proxyBehaviors[match.action] || default_behavior;
  }
  return default_behavior;
}

if (typeof process !== 'undefined' && process.argv.includes('test')) {
  function assertNetwork(ip, expected) {
    const result = printMatchingNetwork(ip, ipv4NetworkRules, ipv6NetworkRules);
    if (result === expected) {
      console.log(`OK: Test for ${ip} passed.`);
    } else {
      console.log(`Failed: Test for ${ip} failed. Expected: ${expected}, but got: ${result}`);
    }
  }

  function assertProxyBehavior(host, expected) {
    const result = FindProxyForURL('', host);
    if (result === expected) {
      console.log(`OK: Test for ${host} => ${expected} passed.`);
    } else {
      console.log(`Failed: Test for ${host} failed. Expected: ${expected}, but got: ${result}`);
    }
  }

  function assertVisitHostWithProxy(host) {
    assertProxyBehavior(host, proxyBehaviors[proxy]);
  }

  function assertHostWithDefaultAction(host) {
    assertProxyBehavior(host, default_behavior);
  }

  function assertDirectHost(host) {
    assertProxyBehavior(host, proxyBehaviors[direct]);
  }

  function assertBlockedHost(host) {
    assertProxyBehavior(host, proxyBehaviors[blocked]);
  }

  function runTests() {
    assertNetwork("127.234.168.10", "127.0.0.0/8");
    assertNetwork("1.1.1.1", null);
    assertNetwork("fe80::f0:c6b3:c766:9b1e", "fe80::/10");
    assertVisitHostWithProxy("com.google");
    assertVisitHostWithProxy("domains.google");
    assertHostWithDefaultAction("www.not-google");
    assertDirectHost("127.3.4.5");
    assertDirectHost("114.114.114.114");
    assertBlockedHost("www.whitehouse.com");
    assertBlockedHost("adservice.google.com.xx")
  }

  runTests();
}
