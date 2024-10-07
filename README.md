# proxy.pac

这个项目用来生成代理自动配置 `proxy.pac` 文件，可以用于配置浏览器或系统级的代理设置。你可以自定义规则，根据配置文件中指定的域名来路由流量。

## 使用方法

1. **域名规则配置**

   项目包含一些示例配置文件：

   - `domain-rules-blocked.txt.example`
   - `domain-rules-direct.txt.example`
   - `domain-rules-proxy.txt.example`

   要使用这些文件，去掉 `.example` 扩展名。每个文件代表不同的代理行为：

   - **Blocked**：添加到 `domain-rules-blocked.txt` 中的域名将被阻止访问。
   - **Direct**：添加到 `domain-rules-direct.txt` 中的域名将绕过代理，直接连接。
   - **Proxy**：添加到 `domain-rules-proxy.txt` 中的域名将使用默认代理。

   将你的域名添加到合适的文件中，每个域名一行。以 `#` 开头的行被视为注释。例如：

   ```
   # 直连域名
   google.com
   example.org
   ```

   你也可以创建自己的自定义规则文件，文件名应遵循 `domain-rules-<rule_name>.txt` 的格式。例如，`domain-rules-companyProxy.txt` 将使该文件中的所有域名使用 `proxy.pac` 中定义的 `companyProxy` 设置。

2. **生成 `proxy.pac` 文件**

   运行脚本生成 `proxy.pac` 文件：

   ```sh
   ./build.sh
   ```

   在项目根目录中会自动生成 `proxy.pac` 文件。

3. **代理配置**

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

4. **测试**

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
