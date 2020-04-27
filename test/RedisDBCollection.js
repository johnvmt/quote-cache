import assert from 'assert';
import path from 'path';
import RedisDBCollection from "../src/collections/RedisDBCollection";
import DBCollection from "../src/collections/DBCollection";

const confFile = process.env.REDIS_TEST_CONFIG;
if (!confFile)
	throw new Error('"REDIS_TEST_CONFIG" not found in environment');

//console.log('loading "' + confFile + '"');
const confFilePath = path.isAbsolute(confFile) ? confFile : path.join(process.cwd(), confFile);
const config = require(confFilePath);

describe(`Processing "${__filename}"`, () => {
	describe('Any-type item functions', () => {
		it('Delete Item', async () => {
			const collection = createCollection();

			await collection.deleteItem('ID');

			const hasItem = await collection.hasItem('ID');

			if(hasItem !== false)
				throw new Error(`Failed to delete item`);
		});

		it('Get nonexisting item', async () => {
			const collection = createCollection();

			const savedItemValue = await collection.getItem('ID');

			if(savedItemValue !== undefined)
				throw new Error(`Nonexisting item's value not undefined`);
		});

		it('Test existence of nonexisting item with hasItem', async () => {
			const collection = createCollection();

			const hasItem = await collection.hasItem('ID');

			if(hasItem !== false)
				throw new Error(`Falsely reporting existing of nonexisting item`);
		});

		it('Test existence of nonexisting item with type', async () => {
			const collection = createCollection();

			const itemType = await collection.itemType('ID');

			if(itemType !== DBCollection.ITEMTYPES.NONE)
				throw new Error(`Falsely reporting existing of nonexisting item`);
		});
	});

	describe('Primitive-type item functions', () => {
		it('Set new itemID, no TTL', async () => {
			let collection = createCollection();

			const itemID = 'ID';
			const insertedItemValue = 'VALUE';

			await collection.upsertPrimitiveItem(itemID, insertedItemValue);

			let savedItemValue = await collection.getItem(itemID);

			if(savedItemValue !== insertedItemValue)
				throw new Error(`retrieved item value doesn't match inserted item value`);
		});

		it('Set new itemID, with TTL; test for existence before TTL', async () => {
			let collection = createCollection();

			const itemID = 'ID';
			const insertedItemValue = 'VALUE';
			const itemTTL = 1000; // 1s

			await collection.upsertPrimitiveItem(itemID, insertedItemValue, itemTTL);

			await sleep(itemTTL/2);

			let savedItemValueX = await collection.getItem(itemID);

			const hasItem = await collection.hasItem('ID');

			if(!hasItem)
				throw new Error(`Item does not exist before expiration of TTL`);

			let savedItemValue = await collection.getItem(itemID);

			if(savedItemValue !== insertedItemValue)
				throw new Error(`retrieved item value doesn't match inserted item value`);
		});

		it('Set new itemID, with TTL; test for existence after TTL', async () => {
			let collection = createCollection();

			const itemID = 'ID';
			const insertedItemValue = 'VALUE';
			const itemTTL = 500; // 0.5s

			await collection.upsertPrimitiveItem(itemID, insertedItemValue, itemTTL);

			await sleep(itemTTL * 2);

			const hasItem = await collection.hasItem('ID');

			if(hasItem)
				throw new Error(`Item reported as existing after TTL`);
		});


		it('Set new itemID, increment value (using numbers)', async () => {
			let collection = createCollection();

			const itemID = 'ID';
			const insertedItemValue = 100;
			const increment = 10;

			await collection.upsertPrimitiveItem(itemID, insertedItemValue);

			await collection.incrementPrimitiveItemBy(itemID, increment);

			let savedItemValue = await collection.getItem(itemID);

			if(Number(savedItemValue) !== Number(insertedItemValue) + Number(increment))
				throw new Error(`retrieved item value doesn't match inserted item value plus increment`);
		});

		it('Set new itemID, increment value (using strings)', async () => {
			let collection = createCollection();

			const itemID = 'ID';
			const insertedItemValue = '100';
			const increment = '10';

			await collection.upsertPrimitiveItem(itemID, insertedItemValue);

			await collection.incrementPrimitiveItemBy(itemID, increment);

			let savedItemValue = await collection.getItem(itemID);

			if(Number(savedItemValue) !== Number(insertedItemValue) + Number(increment))
				throw new Error(`retrieved item value doesn't match inserted item value plus increment`);
		});
	});

	describe('Hash-type item functions', () => {
		it('Set new itemID, no TTL', async () => {
			let collection = createCollection();

			const itemID = 'ID';
			const insertedItemValue = {
				var: "val"
			};

			await collection.upsertHashItem(itemID, cloneObject(insertedItemValue));

			let savedItemValue = await collection.getItem(itemID);

			if(!deepEqual(savedItemValue, insertedItemValue))
				throw new Error(`retrieved item value doesn't match inserted item value`);
		});

		it('Set new itemID, no TTL, add hash fields', async () => {
			let collection = createCollection();

			const itemID = 'ID';
			const insertedItemValue = {
				var: "val"
			};

			const addedHashFields = {
				var2: "val2"
			};

			await collection.upsertHashItem(itemID, cloneObject(insertedItemValue));

			await collection.upsertHashItemFields(itemID, addedHashFields);

			let savedItemValue = await collection.getItem(itemID);

			if(!deepEqual(savedItemValue, Object.assign({}, insertedItemValue, addedHashFields)))
				throw new Error(`retrieved item value doesn't match inserted item value`);
		});

		it('Set new itemID, no TTL, delete hash fields', async () => {
			let collection = createCollection();

			const itemID = 'ID';
			const insertedItemValue = {
				var: "val",
				var2: "val2"
			};

			await collection.upsertHashItem(itemID, cloneObject(insertedItemValue));

			await collection.deleteHashItemFields(itemID, ['var2']);

			let savedItemValue = await collection.getItem(itemID);

			delete insertedItemValue.var2;

			if(!deepEqual(savedItemValue, insertedItemValue))
				throw new Error(`retrieved item value doesn't match inserted item value`);
		});

		it('Set new itemID, increment value (using numbers)', async () => {
			let collection = createCollection();

			const itemID = 'ID';

			const initialValue = 100;
			const increment = 10;

			const insertedItemValue = {
				var: initialValue
			};

			await collection.upsertHashItem(itemID, cloneObject(insertedItemValue));

			await collection.incrementHashItemFieldBy(itemID, 'var', increment);

			let savedItemValue = await collection.getItem(itemID);

			if(Number(savedItemValue.var) !== (initialValue + increment))
				throw new Error(`retrieved item value doesn't match inserted item value plus increment`);
		});

		it('Set new itemID, increment value (using strings)', async () => {
			let collection = createCollection();

			const itemID = 'ID';

			const initialValue = '100';
			const increment = '10';

			const insertedItemValue = {
				var: initialValue
			};

			await collection.upsertHashItem(itemID, cloneObject(insertedItemValue));

			await collection.incrementHashItemFieldBy(itemID, 'var', increment);

			let savedItemValue = await collection.getItem(itemID);

			if(Number(savedItemValue.var) !== (Number(initialValue) + Number(increment)))
				throw new Error(`retrieved item value doesn't match inserted item value plus increment`);
		});
	});
});

async function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function deepEqual(x, y) {
	if ((typeof x == "object" && x != null) && (typeof y == "object" && y != null)) {
		if (Object.keys(x).length !== Object.keys(y).length)
			return false;

		for(var prop in x) {
			if(y.hasOwnProperty(prop)) {
				if (! deepEqual(x[prop], y[prop]))
					return false;
			}
			else
				return false;
		}
		return true;
	}
	else if(x !== y)
		return false;
	else
		return true;
}

function createCollection() {
	return new RedisDBCollection(config);
}

function cloneObject(object) {
	return JSON.parse(JSON.stringify(object));
}