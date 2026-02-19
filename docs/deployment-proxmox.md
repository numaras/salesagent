# Deploy the TypeScript app on a Proxmox container

This guide assumes you have a Proxmox host and want to run the Sales Agent (TS) in an **LXC container**: which image to use, how to create the container, and how to download and run the app.

---

## 1. Image / template to use

Use a **Debian 12** or **Ubuntu 24.04** LXC template so you can install Node.js and (optionally) Docker or Postgres easily.

- **Proxmox UI:** Datacenter → your node → **CT Templates** → download **debian-12** or **ubuntu-24.04** if not already present.
- **CLI (from Proxmox host):**
  ```bash
  pveam update
  pveam download local debian-12-standard_*.tar.zst
  # or: pveam download local ubuntu-24.04-standard_*.tar.zst
  ```

Use that template when creating the container (step 2).

---

## 2. Create the container

1. In Proxmox: **Create CT** (right‑click your node or in the node’s “Create” menu).
2. **General:** Hostname e.g. `salesagent`, password (and/or SSH key).
3. **Template:** Select the **Debian 12** (or Ubuntu 24.04) template you downloaded.
4. **Disks:** Default is fine (e.g. 8 GB).
5. **CPU:** 2 cores is enough to start.
6. **Memory:** 2048 MiB minimum.
7. **Network:** Bridge (e.g. `vmbr0`), DHCP or static IP as you prefer.
8. Finish and **Start** the container.

---

## 3. Two ways to run the app

You can either run everything with **Docker** inside the container (recommended), or install **Node.js + PostgreSQL** and run the app directly.

---

## Option A – Run with Docker (recommended)

Use this if you want Postgres and the app in containers and minimal setup on the host.

### 3.A.1 Enter the container and install Docker

```bash
# From Proxmox host, enter the CT (replace 100 with your CT id)
pct enter 100

# Or SSH into the container if you configured it
# ssh root@<container-ip>
```

Inside the container (Debian 12):

```bash
apt update && apt install -y curl git

# Install Docker (official method)
curl -fsSL https://get.docker.com | sh
```

### 3.A.2 Download the project and run

```bash
cd /opt
git clone https://github.com/prebid/salesagent.git
cd salesagent
```

Run only Postgres and the TS app (no Python):

```bash
docker compose up -d --build postgres ts-db-init ts-app
```

- `postgres` – database
- `ts-db-init` – runs TS migrations once
- `ts-app` – TS app on port 3000

Check:

```bash
docker compose ps
curl -s http://localhost:3000/health
```

### 3.A.3 Expose the app (optional)

- **From the Proxmox host:** Add a port forward (e.g. host 3000 → container 3000), or put a reverse proxy (nginx) on the host and proxy to the container’s port 3000.
- **From the container:** The app listens on `0.0.0.0:3000`, so it’s reachable on the container’s IP at port 3000.

---

## Option B – Run without Docker (Node + PostgreSQL on the container)

Use this if you prefer not to use Docker inside the container.

### 3.B.1 Enter the container and install Node + Postgres

```bash
pct enter 100   # or SSH into the container
```

Debian 12:

```bash
apt update && apt install -y curl git postgresql postgresql-client

# Node 22 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

### 3.B.2 Create database and user

```bash
su - postgres
createuser -P adcp_user   # set a password when prompted
createdb -O adcp_user adcp
exit
```

Allow local connections (optional, for same-machine app):

```bash
# Debian/Ubuntu
echo "local   adcp   adcp_user   md5" >> /etc/postgresql/15/main/pg_hba.conf
# or for PostgreSQL 16: .../16/main/pg_hba.conf
systemctl restart postgresql
```

### 3.B.3 Download the project and run the app

```bash
cd /opt
git clone https://github.com/prebid/salesagent.git
cd salesagent
```

Set the database URL (replace `YOUR_PASSWORD` with the password you set for `adcp_user`):

```bash
export DATABASE_URL="postgresql://adcp_user:YOUR_PASSWORD@localhost:5432/adcp"
```

Install dependencies, run migrations, start:

```bash
npm install
npm run db:migrate
PORT=3000 npm start
```

To keep it running in the background you can use `systemd` (create a unit file) or `tmux`/`screen`.

### 3.B.4 Expose the app

Same as Option A: use the container’s IP and port 3000, or add a port forward / reverse proxy on the Proxmox host.

---

## 4. Summary

| Step | Action |
|------|--------|
| **Image** | Debian 12 or Ubuntu 24.04 LXC template |
| **Create CT** | 2 CPU, 2 GB RAM, network with IP |
| **Download** | `git clone https://github.com/prebid/salesagent.git` (e.g. in `/opt/salesagent`) |
| **With Docker** | `docker compose up -d --build postgres ts-db-init ts-app` |
| **Without Docker** | Install Node + Postgres, set `DATABASE_URL`, `npm install && npm run db:migrate && PORT=3000 npm start` |

Endpoints (replace `<container-ip>` with the CT’s IP or use host port-forward):

- http://\<container-ip\>:3000/
- http://\<container-ip\>:3000/health
- http://\<container-ip\>:3000/admin
- http://\<container-ip\>:3000/mcp
- http://\<container-ip\>:3000/a2a

> **Note:** The React admin UI is built into the Docker image during the multi-stage build — no separate frontend build step is needed.
