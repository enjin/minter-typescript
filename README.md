
# Enjin NFT Batch Creation Example

This project is an example of how to create multiple collections and NFTs on the Enjin Matrixchain blockchain. It demonstrates how to batch-mint tokens in a scalable and efficient manner.

## Project Structure

- **main.ts**: The entry point of the project. It connects to the Enjin Matrixchain, creates collections, and mints tokens in batches.
- **multiTokens.ts**: Contains methods to interact with the multi-tokens pallet, including creating collections and minting tokens.
- **utils.ts**: Provides utility functions for signing and sending transactions.

## Environment Variables

To run the project, ensure the following environment variables are set:

- `BOT_KEY`: The private key or mnemonic of the account that will create collections and mint tokens.
- `WS_ENDPOINT`: WebSocket endpoint for connecting to the Enjin or Canary Matrixchain.
- `COLLECTION_COUNT`: Number of collections to create.
- `TOKEN_COUNT_PER_COLLECTION`: Number of tokens to mint in each collection.
- `TOKEN_COUNT_IN_BATCH`: Number of tokens to mint in a single batch. Maximum is 250.

## Running the Project

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file and set the environment variables.
   ```bash
   cp .env.example .env
   ```

3. Start the project:
   ```bash
   npm start
   ```

The script will automatically create the specified number of collections and mint the tokens according to the environment variables.

## Example

If you want to create 2 collections with 1000 tokens each, with 100 tokens minted in each batch, set the following in your `.env` file:

```env
COLLECTION_COUNT=2
TOKEN_COUNT_PER_COLLECTION=1000
TOKEN_COUNT_IN_BATCH=100
```

Then run the script to mint the tokens in multiple collections.