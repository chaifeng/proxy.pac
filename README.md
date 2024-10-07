# proxy.pac

This project is designed to help you generate a `proxy.pac` file that can be used for configuring browser or system-wide proxy settings. You can define custom rules to route traffic based on the domains specified in your configuration files.

## Usage

1. **Domain Rules Configuration**

   The project includes several example configuration files:

   - `domain-rules-blocked.txt.example`
   - `domain-rules-direct.txt.example`
   - `domain-rules-proxy.txt.example`

   To use these, create your own versions of these files without the `.example` extension. Each file represents a different proxy behavior:

   - **Blocked**: Domains added to `domain-rules-blocked.txt` will be blocked.
   - **Direct**: Domains added to `domain-rules-direct.txt` will bypass the proxy and connect directly.
   - **Proxy**: Domains added to `domain-rules-proxy.txt` will use the default proxy.

   Add your domains to the appropriate files, with each domain on a new line. Lines starting with `#` are treated as comments. For example:

   ```
   # Direct connection domains
   google.com
   example.org
   ```

   You can also create your own custom rule files. The file name should follow the format `domain-rules-<rule_name>.txt`. For example, `domain-rules-companyProxy.txt` will make all domains in that file use the `companyProxy` setting defined in the `proxy.pac`.

2. **Build the `proxy.pac` File**

   Run the build script to generate the `proxy.pac` file:

   ```sh
   ./build.sh
   ```

   This will create the `proxy.pac` file in the project root directory.

3. **Proxy Configuration**

   The generated `proxy.pac` file uses the following default proxy configurations (note that the default proxy server is `SOCKS5 127.0.0.1:1080`):

   ```javascript
   var proxyBehaviors = {
     proxy: "SOCKS5 127.0.0.1:1080", // the default proxy
     direct: DIRECT,
     blocked: "PROXY 0.0.0.0:0",
     "http_proxy": "PROXY 127.0.0.1:3128",
     "companyProxy": "PROXY 192.168.1.1:8080", // domains list in `domain-rules-companyProxy.txt` will use this proxy setting
   };
   ```

   You can modify these values in the `proxy.pac` file after it's generated, or customize them directly in the script if you need different default settings. Please adjust these proxy settings to match your actual environment and requirements.

4. **Test**

   If you have Node.js installed, you can run a test to verify your configuration by using the following command:

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

To add a domain to be blocked, simply edit `domain-rules-blocked.txt`:

```
# Blocked domains
example.com
ads.example.net
```

After running `./build.sh`, the generated `proxy.pac` will block access to `example.com` and `ads.example.net`.

## License

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the [GNU General Public License](./LICENSE) along with this program. If not, see <https://www.gnu.org/licenses/>.
