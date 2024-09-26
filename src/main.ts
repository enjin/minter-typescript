import 'dotenv/config';
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import MultiTokens from './multiTokens';
import { signAndSend, signAndSendReturningEvent } from './utils';
import { KeyringPair } from '@polkadot/keyring/types';

const BOT_KEY = process.env.BOT_KEY;
const ENDPOINT = process.env.WS_ENDPOINT || 'ws://localhost:9944';
const COLLECTION_COUNT = process.env.COLLECTION_COUNT ? parseInt(process.env.COLLECTION_COUNT) : 1;
const TOKEN_COUNT_PER_COLLECTION = process.env.TOKEN_COUNT_PER_COLLECTION ? parseInt(process.env.TOKEN_COUNT_PER_COLLECTION) : 1000;
const TOKEN_COUNT_IN_BATCH = process.env.TOKEN_COUNT_IN_BATCH ? parseInt(process.env.TOKEN_COUNT_IN_BATCH) : 100;

if(TOKEN_COUNT_IN_BATCH > 250) {
  console.error('TOKEN_COUNT_IN_BATCH should be less than or equal to 250');
  process.exit(1);
}

if (!BOT_KEY) {
  console.error('BOT_KEY env variable is not set');
  process.exit(1);
}

async function main(): Promise<void> {
  await cryptoWaitReady();

  console.log(`Connecting to ${ENDPOINT}`);
  const provider = new WsProvider(ENDPOINT, 1000);
  const api = await ApiPromise.create({ provider, throwOnConnect: true });

  const chainInfo = api.registry.getChainProperties();
  const ss58Format = chainInfo?.ss58Format.unwrapOr(undefined)?.toNumber();

  if (!ss58Format) {
    console.error('Chain ss58Format is not set');
    process.exit(1);
  }

  const keyring = new Keyring({ type: 'sr25519', ss58Format });
  const testAccount = keyring.addFromUri(BOT_KEY!);

  const client: MultiTokens = new MultiTokens(api);

  for (let collection = 1; collection <= COLLECTION_COUNT; collection++) {
    console.log(`Creating collection ${collection}`);

    const submitExtrinsicCollection = client.createCollection(TOKEN_COUNT_PER_COLLECTION, 1);

    const collectionCreatedEvent = await signAndSendReturningEvent(
      testAccount,
      submitExtrinsicCollection,
      api.events.multiTokens.CollectionCreated,
      api
    );

    const collectionId: number = Number(collectionCreatedEvent.data[0]);
    console.log(`Collection ${collection} created with id: ${collectionId}`);

    // Calculate the number of full batches and remaining tokens
    const fullBatches: number = Math.floor(TOKEN_COUNT_PER_COLLECTION / TOKEN_COUNT_IN_BATCH);
    const remainingTokens: number = TOKEN_COUNT_PER_COLLECTION % TOKEN_COUNT_IN_BATCH;

    // Mint full batches
    for (let j = 0; j < fullBatches; j++) {
      await mintBatch(
        client,
        api,
        testAccount,
        collectionId,
        j * TOKEN_COUNT_IN_BATCH + 1,
        TOKEN_COUNT_IN_BATCH
      );
    }

    // Mint remaining tokens if any
    if (remainingTokens > 0) {
      await mintBatch(
        client,
        api,
        testAccount,
        collectionId,
        fullBatches * TOKEN_COUNT_IN_BATCH + 1,
        remainingTokens
      );
    }
  }

  console.log('Minting completed. Exiting script.');
  process.exit(0);
}

/**
 * Mints a batch of tokens for the specified range.
 * 
 * @param {MultiTokens} client - The MultiTokens client instance.
 * @param {ApiPromise} api - The Polkadot API instance.
 * @param {KeyringPair} testAccount - The account used for minting.
 * @param {number} collectionId - The ID of the collection to mint tokens in.
 * @param {number} startTokenId - The starting token ID for the batch.
 * @param {number} count - The number of tokens to mint in this batch.
 */
async function mintBatch(
  client: MultiTokens,
  api: ApiPromise,
  testAccount: KeyringPair,
  collectionId: number,
  startTokenId: number,
  count: number
): Promise<void> {
  const batchPayload = Array.from({ length: count }, (_, i) => {
    const tokenId = startTokenId + i;
    return {
      accountId: testAccount.address,
      params: {
        createToken: {
          tokenId: tokenId,
          initialSupply: 1,
          attributes: [
            { key: 'id', value: `${tokenId}` },
            { key: 'name', value: `test-${tokenId}` },
            { key: 'description', value: `test-${tokenId}` },
            { key: 'collectionId', value: `${collectionId}` },
          ],
        },
      },
    };
  });

  const latestHeader = await api.rpc.chain.getHeader();
  const currentBlockNumber = latestHeader.number.toNumber();
  const submitExtrinsic = client.batchMint(collectionId, batchPayload);

  try {
    await signAndSend(testAccount, submitExtrinsic, 0, api);
    console.log(
      `Tokens from ${startTokenId} to ${startTokenId + count - 1} minted at block ${currentBlockNumber + 1}`
    );
  } catch (e) {
    console.error(`Error while minting tokens from ${startTokenId} to ${startTokenId + count - 1}`);
    console.error(e);
  }
}

main();
