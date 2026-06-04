# Remote Encryption

Code references for the remote encryption flow:

| Area | Reference |
| --- | --- |
| Wire contracts | [`RemoteRuntimeEncryptedPayload`](../packages/remote-runtime-contracts/src/index.ts#L216-L230), [`RemoteRuntimeAsymmetricPublicKey`](../packages/remote-runtime-contracts/src/index.ts#L403-L462) |
| Setup key material | [`createRemoteRuntimeSetupRuntimeKeyPair`](../packages/remote-runtime-host/src/index.ts#L920-L933), [`remoteRuntimeSetupRuntimeEncryptionKey`](../packages/remote-runtime-host/src/index.ts#L974-L982) |
| Command encryption | [`encryptRuntimeCommand`](../packages/remote-runtime-host/src/index.ts#L760-L793), [`decryptRuntimeCommandPayload`](../packages/remote-runtime-host/src/index.ts#L795-L828) |
| Associated data | [`encryptedRuntimePayloadAssociatedData`](../packages/remote-runtime-host/src/index.ts#L7141-L7152) |
| Runtime dispatch | [`decryptRemoteRuntimeCommand`](../packages/remote-runtime-host/src/remote-runtime-manager.ts#L2315-L2328) |
| Test coverage | [`local-connector.test.ts`](../packages/remote-runtime-host/test/local-connector.test.ts#L454-L488), [`setup-helpers.test.ts`](../packages/remote-runtime-host/test/setup-helpers.test.ts#L96-L163) |
