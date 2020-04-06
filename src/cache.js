import LocalDBCollection from "./collections/LocalDBCollection";
import PouchDBCollection from "./collections/PouchDBCollection";
import RedisDBCollection from "./collections/RedisDBCollection";
import DBCollection from "./collections/DBCollection";

function cacheCollection(collectionConfig) {
	if(typeof collectionConfig !== 'object' || collectionConfig === null || !collectionConfig.hasOwnProperty('type'))
		throw new Error(`collectionConfig missing 'type' property`);

	switch(collectionConfig.type.toLowerCase()) {
		case 'redis':
			return new RedisDBCollection(collectionConfig.hasOwnProperty('options') ? collectionConfig.options : {});
		case 'pouchdb':
			return new PouchDBCollection(collectionConfig.hasOwnProperty('options') ? collectionConfig.options : {});
		case 'local':
			return new LocalDBCollection();
		default:
			throw new Error(`Unknown collection type ${collectionConfig.type}`);
	}
}

export {cacheCollection, DBCollection, LocalDBCollection, PouchDBCollection, RedisDBCollection};
export default cacheCollection;