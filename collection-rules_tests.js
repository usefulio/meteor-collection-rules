Tinytest.add('CollectionRules - acts like a rule', function (test) {
	var rule = new CollectionRule(new Rule(function (doc) {
		return !!doc.userId;
	}, 'must have a userId'));

	test.throws(function () {rule.check({});}, 'must have a userId');
	test.isFalse(rule.match({}));
	test.isTrue(rule.match({userId: 'someId'}));
	test.equal(rule.errors({})[0].message, 'must have a userId');
});

Tinytest.add('CollectionRules - respects context object', function (test) {
	var rule = new CollectionRule(new Rule(function (doc) {
		return !!doc.userId || this.ignoreErrors;
	}, 'must have a userId'));
	var dontThrowFlag = {ignoreErrors: true};
	rule.check({}, dontThrowFlag);
	test.throws(function () {rule.check({});}, 'must have a userId');
	test.isFalse(rule.match({}));
	test.isTrue(rule.match({}, dontThrowFlag));
	test.equal(rule.errors({})[0].message, 'must have a userId');
	test.isFalse(!!rule.errors({}, dontThrowFlag)[0]);
});

Tinytest.add('CollectionRules - basic api', function (test) {
	var rule = new CollectionRule(new Rule(function (doc) {
		return !!doc.userId && doc.userId == this.userId;
	}, 'must be owner'));

	var id = 'joe';
	var matchingDoc = {
		userId: 'joe'
	};
	var otherDoc = {
		userId: 'other'
	};
	var missingDoc = {

	};

	test.throws(function () {rule.allow(id, otherDoc);}, 'must be owner');
	test.throws(function () {rule.allow(id, missingDoc);}, 'must be owner');

	test.isTrue(rule.allowable(id, matchingDoc));
	test.isFalse(rule.allowable(id, missingDoc));

	test.isFalse(rule.allowErrors(id, matchingDoc)[0]);
	test.equal(rule.allowErrors(id, missingDoc)[0].message, 'must be owner');

	var context = CollectionRule.makeContext(id, matchingDoc);
	var fieldNames = ['userId'];

	test.equal(context.userId, id);
	test.equal(context.doc, matchingDoc);
	test.equal(context.fieldNames[0], fieldNames[0]);

	context = CollectionRule.makeContext(id, matchingDoc, fieldNames, {});

	test.equal(context.fieldNames, fieldNames);
});

Tinytest.add('CollectionRules - handles update modifier', function (test) {
	var id = 'someId';
	var doc = {
		userId: 'someId'
	};
	var otherDoc = {
		userId: 'otherId'
		, items: [
			{
				name: 'sam'
			}
		]
	};
	var setter = {
		$set: {
			userId: 'otherId'
		}
	};
	var unsetter = {
		$unset: {
			userId: true
		}
	};
	var pusher = {
		$push: {
			items: {
				name: 'joe'
			} 
		}
	};

	test.equal(CollectionRule.makeContext(id).userId, 'someId');
	test.equal(CollectionRule.makeContext(id, doc).doc.userId, 'someId');
	test.equal(CollectionRule.makeContext(id, doc).original.userId, 'someId');

	test.equal(CollectionRule.makeContext(id, doc, [], setter).doc.userId, 'otherId');
	test.equal(CollectionRule.makeContext(id, doc, [], setter).original.userId, 'someId');

	test.isFalse(!!CollectionRule.makeContext(id, doc, [], unsetter).doc.userId);
	test.equal(CollectionRule.makeContext(id, doc, [], unsetter).original.userId, 'someId');
	
	test.equal(CollectionRule.makeContext(id, doc, [], pusher).doc.items[0].name, 'joe');
	test.isFalse(CollectionRule.makeContext(id, doc, [], pusher).original.items);

	test.equal(CollectionRule.makeContext(id, otherDoc, [], pusher).doc.items[1].name, 'joe');
	test.isFalse(CollectionRule.makeContext(id, otherDoc, [], pusher).original.items[1]);
});

Tinytest.add('CollectionRules - only runs relevant rules', function (test) {
	var rule = new CollectionRule(function (doc) {
		return doc.userId && (doc.userId == this.userId || 'admin' == this.userId);
	}, {
		status: function (doc) {
			return this.userId == 'admin';
		}
		, paymentMethod: new Rule(function (doc) {
			return !doc.payments;
		}, 'must not have outstanding payments')
	});

	var doc = {
		userId: 'joe'
	};

	var docWithPayments = {
		userId: 'joe'
		, payments: []
	};

	var setStatus = {
		$set: {
			status: 'new'
		}
	};

	var setName = {
		$set: {
			name: 'joseph'
		}
	};

	var setPaymentMethod = {
		$set: {
			paymentMethod: 'xxx-xxx-xxx-123'
		}
	};

	var setBoth = {
		$set: {
			paymentMethod: 'xxx-xxx-xxx-123'
			, status: 'new'
		}
	};
	
	rule.allow('joe', doc, _.keys(setName.$set), setName);
	rule.allow('admin', doc, _.keys(setStatus.$set), setStatus);

	test.throws(function () {
		rule.allow('joe', doc, _.keys(setStatus.$set), setStatus);
	}, 'is invalid');

	rule.allow('joe', doc, _.keys(setPaymentMethod.$set), setPaymentMethod);

	test.throws(function () {
		rule.allow('joe', docWithPayments, _.keys(setPaymentMethod.$set), setPaymentMethod);
	}, 'must not have outstanding payments');

	test.throws(function () {
		rule.allow('joe', doc, _.keys(setBoth.$set), setBoth);
	}, 'is invalid');
});

TestCollection = new Meteor.Collection('test');

if (Meteor.isServer) {
	try {
		CollectionRule.allowInsert(TestCollection, function (doc) {
			return !!doc.name;
		});
		CollectionRule.allowUpdate(TestCollection, /*{
			name:*/ function (doc) {
				return !doc.name;
			}
			/*, comment: function (doc) {
				return this.modifier.$set;
			}
		}*/);

		CollectionRule.allowRemove(TestCollection, function (doc) {
			return !doc.name;
		});

		CollectionRule.attachSchema(TestCollection, {
			name: 'test collection'
			, schema: {
				age: function (val) {
					if (val) {
						return val > 10;
					}
					return true;
				}
			}
		});

		TestCollection.insert({
			name: 'joe'
		});
	} catch (e) {
		Tinytest.add('CollectionRules - attaches to collectons', function (test) {
			throw e;
		});
	}	
}

if (Meteor.isClient) {
	var id;
	Tinytest.addAsync('CollectionRules - allows insert', function (test, next) {
		TestCollection.insert({name: 'joe'}, function (err, result) {
			test.isTrue(!err);
			id = result;
			next();
		});
	});
	Tinytest.addAsync('CollectionRules - denies insert', function (test, next) {
		TestCollection.insert({}, function (err, result) {
			console.log('insert', err, result);
			test.isTrue(err);
			test.equal(err && err.error, 403);
			next();
		});
	});
	Tinytest.addAsync('CollectionRules - allows update', function (test, next) {
		TestCollection.update(id, {$unset: {name: 'joe'}}, function (err, result) {
			test.isTrue(!err);
			next();
		});
	});
	Tinytest.addAsync('CollectionRules - denies update', function (test, next) {
		TestCollection.update(id, {$set: {name: 'joe'}}, function (err, result) {
			test.isTrue(err);
			test.equal(err && err.error, 403);
			next();
		});
	});
	Tinytest.addAsync('CollectionRules - allows delete', function (test, next) {
		TestCollection.remove(id, function (err, result) {
			test.isTrue(!err);
			next();
		});
	});
	Tinytest.addAsync('CollectionRules - denies delete', function (test, next) {
		TestCollection.remove(TestCollection.findOne()._id, function (err, result) {
			test.isTrue(!!err);
			test.equal(err && err.error, 403);
			next();
		});
	});
	Tinytest.addAsync('CollectionRules - allows valid schema on insert', function (test, next) {
		TestCollection.insert({name: 'joe', age: 11}, function (err, result) {
			test.isFalse(!!err);
			id = result;
			next();
		});
	});
	Tinytest.addAsync('CollectionRules - deines invalid schema on insert', function (test, next) {
		TestCollection.insert({name: 'joe', age: 9}, function (err, result) {
			test.isTrue(!!err);
			test.equal(err && err.reason, "test collection age is invalid");
			next();
		});
	});
	Tinytest.addAsync('CollectionRules - allows valid schema on update', function (test, next) {
		TestCollection.update(id, {$set: {age: 15}, $unset: {name: 'joe'}}, function (err, result) {
			test.isTrue(!err);
			next();
		});
	});
	Tinytest.addAsync('CollectionRules - denies invalid schema on update', function (test, next) {
		TestCollection.update(id, {$set: {age: 5}}, function (err, result) {
			test.isTrue(err);
			test.equal(err && err.reason, "test collection age is invalid");
			next();
		});
	});

}
// XXX test collection allow rules
// allowInsert, allowUpdate, allowDelete
