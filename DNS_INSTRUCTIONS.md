# DNS Configuration for Autoflow.space

To enable access to your system via the new domains, you must configure the DNS records at your domain registrar (e.g., GoDaddy, Namecheap, Cloudflare).

## Required Records

| Type | Name | Value | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `cms` | `167.126.22.249` | Automatic / 1 min | Directus Admin Panel |
| **A** | `api` | `167.126.22.249` | Automatic / 1 min | Evolution API Gateway |

## Verification

After adding these records, propagation may take a few minutes to a few hours. You can verify propagation using a tool like [DNS Checker](https://dnschecker.org/#A/cms.autoflow.space).

Once propagated:
- Access **Directus** at: `https://cms.autoflow.space`
- Access **Evolution API** at: `https://api.autoflow.space`

## ⚠️ IMPORTANT: Firewall Configuration (Oracle Cloud)

If you see `ERR_SSL_PROTOCOL_ERROR` or cannot connect, you likely need to open ports 80 and 443 in the Oracle Cloud Console.

1.  Go to **Networking** -> **Virtual Cloud Networks**.
2.  Click on your VCN.
3.  Click on **Security Lists** (usually `Default Security List`).
4.  Click **Add Ingress Rules**.
5.  Add the following rule:
    - **Source CIDR:** `0.0.0.0/0`
    - **IP Protocol:** `TCP`
    - **Destination Port Range:** `80,443`
    - **Description:** `Allow HTTP/HTTPS`
6.  Click **Add Ingress Rules**.

After this, the connection should work immediately.
