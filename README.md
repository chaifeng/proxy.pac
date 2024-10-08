# proxy.pac

- [English](#proxy.pac)
- [中文](#中文介绍)
- [License](#license)

This project is used to generate the proxy auto-configuration `proxy.pac` file, which can be used for configuring browser or system-level proxy settings.

Supports routing traffic through proxies: You can customize rules to route traffic to different proxy servers based on domain names or IP networks specified in the configuration files.

For high-performance matching: Uses a hash table for domain rules, and an IP prefix tree for fast matching of network rules. If there is no domain match, the IP address will be resolved and then matched against network rules.

## Usage

1. **Domain Rule Configuration**

   The project contains some example configuration files:

   - `auto-proxy.txt.example`
   - `domain-rules-blocked.txt.example`
   - `domain-rules-direct.txt.example`
   - `domain-rules-proxy.txt.example`
   - `ipv4-rules-direct.txt.example`
   - `ipv6-rules-direct.txt.example`

   To use these files, remove the `.example` extension. Each file represents a different proxy behavior:

   - **Auto-Proxy Rules**: Add rules to `auto-proxy.txt` to control how websites are accessed.

   All files starting with `auto-proxy` and ending with `.txt` will be parsed as Auto-Proxy rules. If you have multiple Auto-Proxy rules, you can save them as multiple files, like `auto-proxy-1.txt`, `auto-proxy-2.txt`, etc.

   **Note**: Currently, the URL matching rules in Auto-Proxy are ignored, and only domain rules are handled.

   - **Blocked**: Domains added to `domain-rules-blocked.txt` will be blocked from access.
   - **Direct**:
     - Domains added to `domain-rules-direct.txt` will bypass the proxy and connect directly.
     - IPv4 networks (in CIDR format) added to `ipv4-rules-direct.txt` will bypass the proxy and connect directly.
     - IPv6 networks (in CIDR format) added to `ipv6-rules-direct.txt` will bypass the proxy and connect directly.
   - **Proxy**: Domains added to `domain-rules-proxy.txt` will use the default proxy.

   Add your domain names or IP network segments to the appropriate file, with one entry per line. Lines starting with `#` are treated as comments. For example:

   Domains added to `domain-rules-direct.txt` will bypass the proxy and connect directly:
   ```
   # Direct connect domains
   google.com
   example.org
   ```

   IPv4 Networks added to `ipv4-rules-direct.txt` will bypass the proxy and connect directly:
   ```
   # Direct connect IPv4 networks
   192.168.0.0/16
   114.114.114.114/32 # To add a specific IP address, append /32 to the IP address
   ```

   You can also create your own custom rule files, following the format `<domain|ipv4|ipv6>-rules-<rule_name>.txt`. For example, `domain-rules-companyProxy.txt` will make all domains in this file use the `companyProxy` setting defined in `proxy.pac`. `ipv4-rules-block.txt` will block all networks listed in the file.

2. **Generate the `proxy.pac` File**

   Run the script to generate the `proxy.pac` file:

   ```sh
   ./build.sh
   ```

   The `proxy.pac` file will be automatically generated in the project root directory.

3. **Default Rule Sources**

   The build script [`build.sh`](./build.sh) will, by default, download the following files without overwriting existing files of the same name:

   - `auto-proxy.txt`
   - `ipv4-rules-direct.txt`
   - `ipv6-rules-direct.txt`

   If you do not need the Auto-Proxy rules or IP networks rules, you can create empty files with the same name to skip the download.

4. **Proxy Configuration**

   The generated `proxy.pac` file uses the following default proxy configurations (note that the default proxy server is `SOCKS5 127.0.0.1:1080`):

   ```javascript
   var proxyBehaviors = {
     proxy: "SOCKS5 127.0.0.1:1080", // Default proxy
     direct: DIRECT,
     blocked: "PROXY 0.0.0.0:0",
     "http_proxy": "PROXY 127.0.0.1:3128",
     "companyProxy": "PROXY 192.168.1.1:8080", // Domains in `domain-rules-companyProxy.txt` will use this proxy setting
   };
   ```

   You can modify these values after generating `proxy.pac`, or customize them directly in the original script `proxy.js` to use different default settings. Please adjust these settings according to your environment and requirements.

5. **Testing**

   If you have Node.js installed, you can run the following command to test and verify the configuration:

   ```sh
   node proxy.pac test
   ```

   The test code is located at the end of the `proxy.pac` file, for example:

   ```javascript
   assertVisitHostWithProxy("com.google");
   assertVisitHostWithProxy("domains.google");
   assertHostWithDefaultAction("www.not-google");
   assertDirectHost("10.3.4.5");
   assertDirectHost("114.114.114.114");
   assertBlockedHost("www.whitehouse.com");
   ```

## Example

To add a domain that needs to be blocked, simply edit the `domain-rules-blocked.txt` file:

```
# Blocked domains
example.com
ads.example.net
```

Run `./build.sh` to regenerate the `proxy.pac` file, which will block access to `example.com` and `ads.example.net`.

# 中文介绍

这个项目用来生成代理自动配置 `proxy.pac` 文件，可以用于配置浏览器或系统级的代理设置。

支持路由代理流量：你可以自定义规则，根据配置文件中指定的域名或者 IP 网络段来路由流量到不同的代理服务器。

为了高性能匹配：使用哈希表来匹配域名规则，使用 IP 地址前缀树来快速匹配网络段规则。如果没有匹配的域名规则，会解析 IP 地址后再按网络地址段匹配一次。

## 使用方法

1. **域名规则配置**

   项目包含一些示例配置文件：

   - `auto-proxy.txt.example`
   - `domain-rules-blocked.txt.example`
   - `domain-rules-direct.txt.example`
   - `domain-rules-proxy.txt.example`
   - `ipv4-rules-direct.txt.example`
   - `ipv6-rules-direct.txt.example`

   要使用这些文件，去掉 `.example` 扩展名。每个文件代表不同的代理行为：

   - **Auto-Proxy 配置的规则**：把规则添加到 `auto-proxy.txt` 中，将会按照规则来访问网站。

   所有以 `auto-proxy` 开头，并且以 `.txt` 结尾的文件都按 Auto-Proxy 规则来解析。如果你有多个 Auto-Proxy 规则，可以保存为多个文件，例如 `auto-proxy-1.txt`、`auto-proxy-2.txt` 等等。

   **注意**：当前，会忽略 Auto-Proxy 中的 URL 的匹配规则，仅仅处理域名规则。

   - **Blocked**：添加到 `domain-rules-blocked.txt` 中的域名将被阻止访问。
   - **Direct**：
     - 添加到 `domain-rules-direct.txt` 中的域名将绕过代理，直接连接。
     - 添加到 `ipv4-rules-direct.txt` 中的 IPv4 网络段（CIDR格式）将绕过代理，直接连接。
     - 添加到 `ipv6-rules-direct.txt` 中的 IPv6 网络段（CIDR格式）将绕过代理，直接连接。
   - **Proxy**：添加到 `domain-rules-proxy.txt` 中的域名将使用默认代理。

   将你的域名或者IP网络段添加到合适的文件中，每个域名一行。以 `#` 开头的行被视为注释。例如：

   文件 domain-rules-direct.txt 中添加的域名将会绕过代理直接连接
   ```
   # 直连域名
   google.com
   example.org
   ```

   文件 ipv4-rules-direct.txt 中添加的网络段将会绕过代理直接连接
   ```
   # 直连的 IPv4 网络段
   192.168.0.0/16
   114.114.114.114/32 # 如果要添加一个特定 IP 地址，请追加 /32 到 IP 地址后面
   ```

   你也可以创建自己的自定义规则文件，文件名应遵循 `<domain|ipv4|ipv6>-rules-<rule_name>.txt` 的格式。例如，`domain-rules-companyProxy.txt` 将使该文件中的所有域名使用 `proxy.pac` 中定义的 `companyProxy` 设置。`ipv4-rules-block.txt` 将不可访问文件中的所有网络段。


2. **生成 `proxy.pac` 文件**

   运行脚本生成 `proxy.pac` 文件：

   ```sh
   ./build.sh
   ```

   在项目根目录中会自动生成 `proxy.pac` 文件。

3. **默认的规则来源**
   构建脚本 [`build.sh`](./build.sh) 默认会下载以下文件，但不会覆盖已有的同名文件：

   - `auto-proxy.txt`
   - `ipv4-rules-direct.txt`
   - `ipv6-rules-direct.txt`

   如果你不需要 Auto-Proxy 的规则或者 IP 网络段的规则，请创建同名的空文件即可忽略下载。

4. **代理配置**

   生成的 `proxy.pac` 文件使用以下默认的代理配置（注意默认代理服务器是 `SOCKS5 127.0.0.1:1080`）：

   ```javascript
   var proxyBehaviors = {
     proxy: "SOCKS5 127.0.0.1:1080", // 默认代理
     direct: DIRECT,
     blocked: "PROXY 0.0.0.0:0",
     "http_proxy": "PROXY 127.0.0.1:3128",
     "companyProxy": "PROXY 192.168.1.1:8080", // `domain-rules-companyProxy.txt` 中的域名将使用此代理设置
   };
   ```

   你可以在生成 `proxy.pac` 后修改这些值，或者直接在原始脚本 `proxy.js` 中进行自定义，以便使用不同的默认设置。请根据实际环境和需求调整这些代理设置。

5. **测试**

   如果安装了 Node.js，可以使用以下命令运行测试以验证配置：

   ```sh
   node proxy.pac test
   ```

   测试代码位于 `proxy.pac` 文件的末尾，例如：

   ```javascript
   assertVisitHostWithProxy("com.google");
   assertVisitHostWithProxy("domains.google");
   assertHostWithDefaultAction("www.not-google");
   assertDirectHost("10.3.4.5");
   assertDirectHost("114.114.114.114");
   assertBlockedHost("www.whitehouse.com");
   ```

## 示例

要添加一个需要被阻止的域名，只需编辑 `domain-rules-blocked.txt` 文件：

```
# 被阻止的域名
example.com
ads.example.net
```

运行 `./build.sh` 重新生成的 `proxy.pac` 将阻止访问 `example.com` 和 `ads.example.net`。

## License

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the [GNU General Public License](./LICENSE) along with this program. If not, see <https://www.gnu.org/licenses/>.
