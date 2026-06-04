# @interbase/sdk

JavaScript SDK for driving a local `interbase` CLI server.

## Requirements

- Node.js `18+`
- an `interbase` binary available on `PATH`

## Install

```bash
npm install @interbase/sdk
```

## Usage

```ts
import { createOpencodeClient, createOpencodeServer } from "@interbase/sdk"

const server = await createOpencodeServer()
const client = createOpencodeClient({ baseUrl: server.url })
```

`createOpencodeServer()` spawns the `interbase` CLI locally. This package does not include hosted Interbase account or backend services.
