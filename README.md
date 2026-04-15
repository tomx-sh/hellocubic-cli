# hellocubic-cli

CLI for Hellocubic device endpoints on a local network.

## Install

```bash
bun install
```

## Usage

```bash
bun run src/index.ts <command> --ip <ip_or_host>
```

You can also use:

```bash
bun run cli <command> --ip <ip_or_host>
```

## Commands

Read current params:

```bash
bun run cli read --ip 192.168.1.42
```

Set params (`autoplay` and/or `i_i`):

```bash
bun run cli set --ip 192.168.1.42 --autoplay 1 --interval 5
```

List images:

```bash
bun run cli list-images --ip 192.168.1.42
```

Upload image:

```bash
bun run cli upload-image --ip 192.168.1.42 --file ./photo.jpg
```

Select image:

```bash
bun run cli select-image --ip 192.168.1.42 --name "photo.jpg"
```

Delete one file:

```bash
bun run cli delete-file --ip 192.168.1.42 --file "/image/photo.jpg"
```

Clear image directory:

```bash
bun run cli clear-images --ip 192.168.1.42
```
