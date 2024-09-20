import 'dotenv/config';
import type { AddressOrPair, SubmittableExtrinsic } from '@polkadot/api/types';
import type { AugmentedEvent } from '@polkadot/api-base/types';
import type { AnyTuple, IEvent } from '@polkadot/types/types';
import type { Event } from '@polkadot/types/interfaces/system';
import { ApiPromise } from '@polkadot/api'

/**
 * Function to sign and send submittable object.
 *
 * @param {object | string} origin - string which represents wallet used for transaction.
 * @param {object} submitExtrinsic - submittable object to be signed and sent.
 * @returns {Promise} Function returns the events from the submitted transaction.
 * @example
 * alice = keyring.createFromUri('//Alice');
 * tx = api.tx.balances.transfer(BOB, 1_000_000_000_000);
 * const events = await signAndSend(alice, tx);
 */
export async function signAndSendOnce(
	origin: AddressOrPair,
	submitExtrinsic: SubmittableExtrinsic<'promise'>,
	api: ApiPromise
): Promise<Event[]> {
	return new Promise(async function (resolve, reject) {
		const currentHeader = await api.rpc.chain.getHeader();
		const currentBlockNumber = currentHeader.number.toNumber();
		const blockHash = currentHeader.hash;
		
		submitExtrinsic
			.signAndSend(origin, { nonce: -1, era: api.createType('ExtrinsicEra', {current: currentBlockNumber, period: 1024, }), blockHash }, result => {
				if (result.isError) {
					reject(new Error(`transaction error: ${JSON.stringify(result, null, 2)}`));
				} else if (result.isInBlock || result.isFinalized) {
					const array: Event[] = result.events.map(({ event }) => event);
					resolve(array);
				}
			})
			.catch((error: Error) => {
				reject(error);
			});
	});
}

/**
 * Function to sign and send submittable object with retry mechanism.
 *
 * @param {object | string} origin - string which represents wallet used for transaction.
 * @param {object} submitExtrinsic - submittable object to be signed and sent.
 * @param {number} [attempt] - used to keep track of retry attempts. Throws Error if above 10.
 * @returns { Promise } Function returns the events from the submitted transaction.
 * @example
 * alice = keyring.createFromUri('//Alice');
 * tx = api.tx.balances.transfer(BOB, 1_000_000_000_000);
 * const events = await signAndSend(alice, tx);
 */
export async function signAndSend(
	origin: AddressOrPair,
	submitExtrinsic: SubmittableExtrinsic<'promise'>,
	attempt = 0,
	api: ApiPromise
): Promise<Event[]> {
	if (attempt > 10) {
		throw new Error('unable to send transaction');
	}
	try {
		return await signAndSendOnce(origin, submitExtrinsic, api);
	} catch (e: unknown) {
		throw e;
	}
}

/**
 * Function let to sign and send submittable object, but return only the particular event.
 *
 * Throws an exception if the given event is not found in the transaction's events.
 *
 * @param {object | string} origin - string which represents wallet used for transaction.
 * @param {object} submitExtrinsic - submittable object to be signed and sent.
 * @param {object} eventIs - the event to return from the events.
 * @returns {Promise} Function returns the given event, resulting from the transaction.
 * @example
 * const successEvent = await signAndSend(alice, tx, api.events.system.ExtrinsicSuccess);
 */
export async function signAndSendReturningEvent<T extends AnyTuple = AnyTuple, N = unknown>(
	origin: AddressOrPair,
	submitExtrinsic: SubmittableExtrinsic<'promise'>,
	eventIs: AugmentedEvent<'promise', T, N>,
	api: ApiPromise
): Promise<Event & IEvent<T, N>> {
	const events = await signAndSend(origin, submitExtrinsic, 0, api);
	return getEventFromEventsOrThrow(events, eventIs);
}

/**
 * Returns a particular event from an array of events.
 *
 * @param {Array} events - an array of events to find an event in.
 * @param {object} eventIs - the event to find in the events array.
 * @returns {Promise} the event in the event array.
 * @example
 * const events = await signAndSend(alice, tx);
 * const successEvent = getEventFromEventsOrThrow(events, api.events.system.ExtrinsicSuccess);
 */
export function getEventFromEventsOrThrow<T extends AnyTuple = AnyTuple, N = unknown>(
	events: Event[],
	eventIs: AugmentedEvent<'promise', T, N>
): Event & IEvent<T, N> {
	const needle = getEventFromEvents(events, eventIs);

	if (needle === undefined) {
		const eventName = eventIs.meta.name.toHuman();
		throw new Error(`unable to find event ${eventName}`);
	}

	return needle;
}

/**
 * Returns a particular event from an array of events.
 *
 * @param {Array} events - an array of events to find an event in.
 * @param {object} eventIs - the event to find in the events array.
 * @returns {Promise} the event in the event array.
 * @example
 * const events = await signAndSend(alice, tx);
 * const successEvent = getEventFromEventsOrThrow(events, api.events.system.ExtrinsicSuccess);
 */
export function getEventFromEvents<T extends AnyTuple = AnyTuple, N = unknown>(
	events: Event[],
	eventIs: AugmentedEvent<'promise', T, N>
): (Event & IEvent<T, N>) | undefined {
	const needle = events.find(event => eventIs.is(event));

	if (needle === undefined || !eventIs.is(needle)) {
		return undefined;
	}

	return needle;
}