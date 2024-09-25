import type { SubmittableExtrinsic } from '@polkadot/api/types';
import { ApiPromise } from '@polkadot/api';

interface Royalty {
	beneficiary: string;
	percentage: number;
}

export type MarketBehavior = { hasRoyalty: Royalty } | { isCurrency: null } | 'IsCurrency';

export type TokenCap = { singleMint: null } | { supply: number };

export type SufficiencyParam =
	| { insufficient: { unitPrice: bigint | number } }
	| { sufficient: { minimumBalance: bigint | number } };

export interface MintCreateToken {
	tokenId: number;
	initialSupply: number;
	unitPrice?: bigint | number;
	sufficiency?: SufficiencyParam;
	cap?: TokenCap | undefined;
	behavior?: MarketBehavior | null;
	listingForbidden?: boolean;
	attributes?: { key: string; value: string }[];
}

export interface MintMint {
	tokenId: number;
	amount: number;
	unitPrice?: bigint | number | undefined;
}

export interface TokenAssetId {
	collectionId: number;
	tokenId: number;
}

/**
 *  Class which represents MultiTokens pallet.
 */
export default class MultiTokens {
	api: ApiPromise;
	/**
	 * Creates MultiTokens pallet, using the given API connection.
	 *
	 * @param {object} api - the parachain connection.
	 */
	constructor(api: ApiPromise) {
		this.api = api;
	}

	/**
	 * Function to create collection.
	 *
	 * @param {number} maxTokenCount - number which represents number of maxTokenCount.
	 * @param {number} maxTokenSupply - number which represents number of maxTokenSupply.
	 * @param {boolean} forceSingleMint - boolean which represents number of forceSingleMint.
	 * @param {object} [royalty] - object which represents collection royalty.
	 * @param {Array} [explicitRoyaltyCurrencies] - Array of currencies that follow standard collectionId + tokenId standard, ex. for EFI 0,0.
	 * @example
	 * explicitRoyaltyCurrencies: [
	 *		[0, 0],
	 * ],
	 * @returns {object} Function returns object: Submittable in case of correct call Error object instead of incorrect one.
	 * @example
	 * submitExtrinsic = client.multiTokens.createCollection(
	 *		this,
	 *		test.maxTokenCount,
	 *		test.maxTokenSupply,
	 *		test.forceSingleMint,
	 *		null,
	 *		test.explicitRoyaltyCurrencies
	 * );
	 */
	createCollection(
		maxTokenCount?: number | null | undefined,
		maxTokenSupply?: number | null | undefined,
		forceSingleMint = false,
		royalty: Royalty | null = null,
		explicitRoyaltyCurrencies: TokenAssetId[] = []
	): SubmittableExtrinsic<'promise'> {
		const descriptor = {
			policy: {
				mint: {
					maxTokenCount,
					maxTokenSupply,
					forceSingleMint,
				},
				market: {
					royalty,
				},
			},
			explicitRoyaltyCurrencies,
		};
		try {
			const submitExtrinsic = this.api.tx.multiTokens.createCollection(descriptor);
			return submitExtrinsic;
		} catch (error) {
			throw error;
		}
	}

	/**
	 * Function to batch mint tokens.
	 *
	 * @param {number} collectionId - collection id.
	 * @param {Array} recipients - array that takes recipients objects, example object below.
	 * @returns {object} Function returns object: Submittable in case of correct all, Error object instead of incorrect one.
	 * @example
	 * const results = client.multiTokens.batchMint(this, test.collectionId, [
	 *	{
	 *		accountId: test.address,
	 *		params: {
	 *			createToken: {
	 *				tokenId: test.tokenId,
	 *				initialSupply: test.initialSupply,
	 *				unitPrice: test.unitPrice,
	 *				cap: test.cap,
	 *				royalty: {
	 *					beneficiary: test.beneficiary,
	 *					percentage: test.percentage,
	 *				},
	 *			},
	 *		},
	 *	},
	 * ]);
	 */
	batchMint(
		collectionId: number,
		recipients:
			| {
					accountId: string;
					params: { createToken: MintCreateToken } | { mint: MintMint };
			  }[]
	): SubmittableExtrinsic<'promise'> {
		try {
			const fixedRecipients = recipients.map(recipient => {
				const { accountId, params } = recipient;
				if ('createToken' in params) {
					return {
						accountId,
						params: { createToken: this.fixMintCreateToken(params.createToken) },
					};
				}
				return recipient;
			});
			const submitExtrinsic = this.api.tx.multiTokens.batchMint(collectionId, fixedRecipients);
			
			return submitExtrinsic;
		} catch (error) {
			throw error;
		}
	}


	/**
	 * Updates the CreateToken param for the `sufficiencyParam` which EFI-2077
	 * added.
	 *
	 * @param {MintCreateToken} createToken the CreateToken for minting
	 * @returns {MintCreateToken} the CreateToken value, fixed for `sufficiencyParam`
	 */
	fixMintCreateToken(createToken: MintCreateToken): MintCreateToken {
		if (
			this.api.registry.hasType('EpMultiTokensPolicyMintSufficiencyParam') &&
			createToken.unitPrice !== undefined
		) {
			return {
				sufficiency: { insufficient: { unitPrice: createToken.unitPrice } },
				...createToken,
			};
		}
		return createToken;
	}

	/**
	 * Function to mint token.
	 *
	 * @param {string} recipient - recipient's address that receive token.
	 * @param {number} collectionId - collection id.
	 * @param {object} token - object which represents token details.
	 * @returns {object} Function returns object: Submittable in case of correct all, Error object instead of incorrect one.
	 * @example
	 * const mintToken = client.multiTokens.mint(this, testAccount.address, collectionId, {
	 *		tokenId: test.tokenId,
	 *		amount: test.amount ? test.amount : amount,
	 *		unitPrice: test.unitPrice,
	 *	});
	 */
	mint(
		recipient: string,
		collectionId: number,
		token: MintMint
	): SubmittableExtrinsic<'promise'> {
		try {
			const submitExtrinsic = this.api.tx.multiTokens.mint(recipient, collectionId, {
				Mint: token,
			});
			
			return submitExtrinsic;
		} catch (error) {
			throw error;
		}
	}
}
