import DBCollection from "./DBCollection";
import PouchDB from "pouchdb";
import PouchDBAdapterMemory from "pouchdb-adapter-memory";
import SubscriptionController from "./SubscriptionController";

PouchDB.plugin(PouchDBAdapterMemory);

class PouchDBCollection extends DBCollection {

	constructor(options = {}) {
		super();

		const pouchDBOptions = (typeof options === 'object' && options !== null && options.hasOwnProperty('pouchdb')) ? options.pouchdb : {
			name: "mydb",
			adapter: "memory"
		};

		this.db = new PouchDB(pouchDBOptions);
	}

	async upsertItem(itemID, itemValue) {
		let dbDoc = await this.getItem(itemID);

		let upsertDoc = Object.assign({
			_id: itemID
		}, itemValue);

		if(dbDoc !== undefined && dbDoc.hasOwnProperty('_rev'))
			upsertDoc._rev = dbDoc._rev;

		await this.db.put(upsertDoc);

		return true;
	}

	/**
	 * Get an item of any type from the collection
	 * @param itemID
	 * @returns {Promise<*|unknown[]>}
	 */
	async getItem(itemID) {
		try {
			return await this.db.get(itemID)
		}
		catch(error) {
			if(String(error.status) === "404")
				return undefined;
			else
				throw error;
		}
	}

	/**
	 * Delete an item of any type from the collection
	 * @param itemID
	 * @returns {Promise<boolean>}
	 */
	async deleteItem(itemID) {
		let dbDoc = await this.getItem(itemID);

		if(dbDoc !== undefined) {
			const deleteDoc = Object.assign({
				_deleted: true
			}, dbDoc);

			await this.db.put(deleteDoc);
		}
	}

	/**
	 * Subscribe to mutations on an item of any type
	 * Mutations can be INSERT, UPDATE, or DELETE for any item type
	 * Mutations can also be INSERTVALUE or DELETEVALUE for lists and sets
	 * @param itemID
	 * @returns {SubscriptionController}
	 */
	subscribeItem(itemID) {
		// TODO share subscriptionControllers and Build into DBCollection?

		const itemSubscription = new SubscriptionController();

		this.getItem(itemID).then(doc => {
			if(doc !== undefined)
				itemSubscription.mutation(PouchDBCollection.ITEMMUTATIONTYPES.UPSERT, itemID, PouchDBCollection.ITEMTYPES.DOC, doc);
		});

		const pouchDBChangesController = this.db.changes({
			doc_ids: [itemID],
			since: 'now',
			live: true,
			include_docs: true
		}).on('change', (change) => {
			if(change.deleted)
				itemSubscription.mutation(PouchDBCollection.ITEMMUTATIONTYPES.DELETE, itemID, PouchDBCollection.ITEMTYPES.DOC);
			else
				itemSubscription.mutation(PouchDBCollection.ITEMMUTATIONTYPES.UPSERT, itemID, PouchDBCollection.ITEMTYPES.DOC, change.doc);
		});

		itemSubscription.once('cancel', () => {
			pouchDBChangesController.cancel();
		});

		return itemSubscription;
	}

	/**
	 * Get an object with the item type and value
	 * @param itemID
	 * @returns {Promise<{type: (string|number|"LIST"|"ListValue"), value: (*|unknown[])}>}
	 */
	async getItemWithType(itemID) {
		const doc = await this.getItem(itemID);

		return {
			type: (doc === undefined) ? PouchDBCollection.ITEMTYPES.NONE : PouchDBCollection.ITEMTYPES.DOC,
			value: doc
		};
	}

	/**
	 * Check if the collection has an item of any type with the specified itemID
	 * @param itemID
	 * @returns {Promise<boolean>}
	 */
	async hasItem(itemID) {
		throw new Error(DBCollection.ERRORS.NOT_IMPLEMENTED);
	}

	/**
	 *
	 * @param itemID
	 * @returns {string|GLenum|number|string}
	 */
	itemType(itemID) {
		if(!this.hasItem(itemID))
			return DBCollection.ITEMTYPES.NONE;
		else {
			const itemValue = this._items.get(itemID); // Get directly to get non-converted value
			if(Array.isArray(itemValue))
				return DBCollection.ITEMTYPES.LIST;
			else if(typeof itemValue === 'object' && itemValue !== null)
				return DBCollection.ITEMTYPES.HASH;
			else if(itemValue instanceof Set)
				return  DBCollection.ITEMTYPES.SET;
			else
				return  DBCollection.ITEMTYPES.PRIMITIVE;
		}
	}

	static get ITEMMUTATIONTYPES() {
		return Object.freeze({
			UPSERT: 'UPSERT',
			DELETE: 'DELETE'
		});
	}

	static get ITEMTYPES() {
		return Object.freeze({
			DOC: 'DOC',
			NONE: 'NONE'
		});
	}

	static get ERRORS() {
		return Object.freeze({
			NOT_IMPLEMENTED: 'Not implemented',
			INVALID_INPUT_VALUE: 'Invalid input value',
			INVALID_ITEM_TYPE: 'Invalid item type',
			UNKNOWN_ITEM_TYPE: 'Internal error: Unknown item type',
			INCOMPATIBLE_ITEM_TYPE: 'Incompatible item type',
			INVALID_FIELDS_LIST: 'Invalid field list',
			INVALID_VALUES_LIST: 'Invalid values list'
		});
	}

	/**
	 * Returns true if testValue is a valid none (undefined)
	 * @param testValue
	 * @returns {boolean}
	 */
	static validNoneInputValue(testValue) {
		return testValue === undefined;
	}

	static validDocInputValue(testValue) {
		return (typeof testValue === 'object' && testValue !== null);
	}
}

export default PouchDBCollection;
