Collection Rules
====================

A simple package which depends on the rules and schema packages and allows you to attach rules and schemas to collections for access control.

API
--------------------
The api is quite simple:
 - `CollectionRules.allowInsert(collection, rules)` Creates a new CollectionRule from rules and calls collection.allow({insert: collectionRule}). In other words allows inserts to the collection which pass all of the rules specified.
 - `CollectionRules.allowUpdate(collection, rules)` Like allowInsert, allows updates to the collection which pass all of the rules specified
 - `CollectionRules.allowRemove(collection, rules)` Like allowInsert and allowUpdate, allows remove operations to the collection which pass all of the rules specified.
 - `CollectionRules.attachSchema(collection, schema)` Creates a new CollectionRule from the Schema and calles collection.deny({insert: rule, update:rule}). In other words prevents inserts or updates which don't conform to the specified schema.
 - `CollectionRules.create` Create a new CollectionRule, you shouldn't need to use this function, but you could if you wanted more control over how the rule is used.
 - `CollectionRules.makeContext(userId, doc, fieldNames, modifier)` Takes the same arguments as a meteor collection allow or deny rule and returns an object which represents the changes to be made. Collection rules will be run with this object as the 'this' context. The returned object has several properties:
     + `userId` The current userId (will allways be identical to the first argument passed to the makeContext method).
     + `doc` The document being inserted, updated or removed, including any changes made. (This document is generated using a null meteor collection and applying the update modifier to it, if applicable).
     + `original` The document before any updates (will allways be identical to the second argument passed to the makeContext method).
     + `fieldnames` A list of fieldNames modified (the third argument to the makeContext method). If the fieldNames list is not passed in makeContext will generate a fieldNames list by getting all keys present on the document.
     + `modifier` The modifier object, if present.
