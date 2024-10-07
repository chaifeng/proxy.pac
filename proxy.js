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

function isInDirectAccessNetwork(ip) {
  return !!findMatchingNetwork(ip, directAccessIPv4Networks, directAccessIPv6Networks);
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

function findMatchingNetwork(ip, networks4, networks6) {
  if (ip.includes('.')) { // IPv4
    const ipNumber = ipToNumber(ip);
    for (let [network, prefix] of networks4) {
      mask = subnetMaks32[prefix]
      if ((ipNumber & mask) === (network & mask)) {
        return [network, prefix];
      }
    }
  } else { // IPv6
    const [ipHigh, ipLow] = ipv6ToTwoNumbers(ip);
    for (let [networkHigh, networkLow, mask] of networks6) {
      if (mask>64) {
        maskHigh = 0xffffffffffffffffn;
        maskLow = subnetMaks64[mask-64];
      } else {
        maskHigh = subnetMaks64[mask];
        maskLow = 0x0000000000000000n;
      }
      if (((ipHigh & maskHigh) === (networkHigh & maskHigh)) &&
        ((ipLow & maskLow) === (networkLow & maskLow))) {
        return [networkHigh, networkLow, mask];
      }
    }
  }
  return null;
}

function printMatchingNetwork(ip, networks4, networks6) {
  const matchedNetwork = findMatchingNetwork(ip, networks4, networks6);
  if (matchedNetwork) {
    if (ip.includes('.')) { // IPv4
      const [network, prefixLength] = matchedNetwork;
      return `${numberToIp(network)}/${prefixLength}`;
    } else { // IPv6
      const [networkHigh, networkLow, prefixLength] = matchedNetwork;
      return `${twoNumbersToIpv6(networkHigh, networkLow)}/${prefixLength}`;
    }
  } else {
    return null;
  }
}

const subnetMaks32 = [
  0x00000000, // 0
  0x80000000, // 1
  0xc0000000, // 2
  0xe0000000, // 3
  0xf0000000, // 4
  0xf8000000, // 5
  0xfc000000, // 6
  0xfe000000, // 7
  0xff000000, // 8
  0xff800000, // 9
  0xffc00000, // 10
  0xffe00000, // 11
  0xfff00000, // 12
  0xfff80000, // 13
  0xfffc0000, // 14
  0xfffe0000, // 15
  0xffff0000, // 16
  0xffff8000, // 17
  0xffffc000, // 18
  0xffffe000, // 19
  0xfffff000, // 20
  0xfffff800, // 21
  0xfffffc00, // 22
  0xfffffe00, // 23
  0xffffff00, // 24
  0xffffff80, // 25
  0xffffffc0, // 26
  0xffffffe0, // 27
  0xfffffff0, // 28
  0xfffffff8, // 29
  0xfffffffc, // 30
  0xfffffffe, // 31
  0xffffffff, // 32
];

const subnetMaks64 = [
  0x0000000000000000n, // 0
  0x8000000000000000n, // 1
  0xc000000000000000n, // 2
  0xe000000000000000n, // 3
  0xf000000000000000n, // 4
  0xf800000000000000n, // 5
  0xfc00000000000000n, // 6
  0xfe00000000000000n, // 7
  0xff00000000000000n, // 8
  0xff80000000000000n, // 9
  0xffc0000000000000n, // 10
  0xffe0000000000000n, // 11
  0xfff0000000000000n, // 12
  0xfff8000000000000n, // 13
  0xfffc000000000000n, // 14
  0xfffe000000000000n, // 15
  0xffff000000000000n, // 16
  0xffff800000000000n, // 17
  0xffffc00000000000n, // 18
  0xffffe00000000000n, // 19
  0xfffff00000000000n, // 20
  0xfffff80000000000n, // 21
  0xfffffc0000000000n, // 22
  0xfffffe0000000000n, // 23
  0xffffff0000000000n, // 24
  0xffffff8000000000n, // 25
  0xffffffc000000000n, // 26
  0xffffffe000000000n, // 27
  0xfffffff000000000n, // 28
  0xfffffff800000000n, // 29
  0xfffffffc00000000n, // 30
  0xfffffffe00000000n, // 31
  0xffffffff00000000n, // 32
  0xffffffff80000000n, // 33
  0xffffffffc0000000n, // 34
  0xffffffffe0000000n, // 35
  0xfffffffff0000000n, // 36
  0xfffffffff8000000n, // 37
  0xfffffffffc000000n, // 38
  0xfffffffffe000000n, // 39
  0xffffffffff000000n, // 40
  0xffffffffff800000n, // 41
  0xffffffffffc00000n, // 42
  0xffffffffffe00000n, // 43
  0xfffffffffff00000n, // 44
  0xfffffffffff80000n, // 45
  0xfffffffffffc0000n, // 46
  0xfffffffffffe0000n, // 47
  0xffffffffffff0000n, // 48
  0xffffffffffff8000n, // 49
  0xffffffffffffc000n, // 50
  0xffffffffffffe000n, // 51
  0xfffffffffffff000n, // 52
  0xfffffffffffff800n, // 53
  0xfffffffffffffc00n, // 54
  0xfffffffffffffe00n, // 55
  0xffffffffffffff00n, // 56
  0xffffffffffffff80n, // 57
  0xffffffffffffffc0n, // 58
  0xffffffffffffffe0n, // 59
  0xfffffffffffffff0n, // 60
  0xfffffffffffffff8n, // 61
  0xfffffffffffffffcn, // 62
  0xfffffffffffffffen, // 63
  0xffffffffffffffffn, // 64
];

const directAccessIPv4Networks = [
  [0xC0A80000, 16], // 192.168.0.0/16
  [0x0A000000, 8], // 10.0.0.0/8
  [0xAC100000, 12], // 172.16.0.0/12
  [0x7F000000, 8], // 127.0.0.0/8 (Loopback)
  [0xA9FE0000, 16], // 169.254.0.0/16 (Link Local)
  [0x64400000, 10], // 100.64.0.0/10 (Carrier-grade NAT)
  // begin of ipv4 networks
  // end of ipv4 networks
];

const directAccessIPv6Networks = [
  [0x0000000000000000n, 0x0000000000000000n, 128], // ::/128 (Unspecified Address)
  [0x0000000000000000n, 0x0000000000000001n, 128], // ::1/128 (Loopback Address)
  [0x20010db800000000n, 0x0000000000000000n, 32], // 2001:db8::/32 (Documentation Address)
  [0xfc00000000000000n, 0x0000000000000000n, 7], // fc00::/7 (Unique Local Address)
  [0xff00000000000000n, 0x0000000000000000n, 8], // ff00::/8 (Multicast Address)
  [0x2001000000000000n, 0x0000000000000000n, 16], // 2001::/16 (Teredo Address)
  [0xfe80000000000000n, 0x0000000000000000n, 10], // fe80::/10 (Link-Local Address)
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

function FindProxyForURL(url, host) {
  if (isIpAddress(host)) {
    if(isInDirectAccessNetwork(host)) {
      return DIRECT;
    } else {
      var action = proxyRules[host];
      if (action !== undefined) {
        return proxyBehaviors[action] || default_behavior;
      }
      return default_behavior;
    }
  }

  while (true) {
    var action = proxyRules[host];
    if (action !== undefined) {
      return proxyBehaviors[action] || default_behavior;
    }
    var nextDot = host.indexOf(".");
    if (nextDot === -1) {
      break;
    }
    host = host.substring(nextDot + 1);
  }
  var remote_ip = undefined;
  if(typeof dnsResolveEx == 'function') {
    remote_ip = dnsResolveEx(host);
  } else if(typeof dnsResolve == 'function') {
    remote_ip = dnsResolve(host);
  }
  if(remote_ip !== undefined && isInDirectAccessNetwork(remote_ip)) {
    return DIRECT
  }
  return default_behavior;
}

if (typeof process !== 'undefined' && process.argv.includes('test')) {
  function assertNetwork(ip, expected) {
    const result = printMatchingNetwork(ip, directAccessIPv4Networks, directAccessIPv6Networks);
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
    assertNetwork("192.168.1.10", "192.168.0.0/16");
    assertNetwork("1.1.1.1", null);
    assertNetwork("172.19.1.1", "172.16.0.0/12");
    assertNetwork("2001:0db8:85a3:0000:0000:8a2e:0370:7334", "2001:db8::/32");
    assertNetwork("fe80::f0:c6b3:c766:9b1e", "fe80::/10");
    assertVisitHostWithProxy("com.google");
    assertVisitHostWithProxy("domains.google");
    assertHostWithDefaultAction("www.not-google");
    assertDirectHost("10.3.4.5");
    assertDirectHost("114.114.114.114");
    assertBlockedHost("www.whitehouse.com");
  }

  runTests();
}
