var FieldsRule = function (rules) {
	_.each(rules, function (rule, key) {
		if (typeof rule.errors != 'function') {
			rules[key] = new Rule(rule);
		}
	});
	this.rules = rules;
};

FieldsRule.prototype = _.clone(Rule.prototype);

FieldsRule.prototype.errors = function (value, context, message, shortCircut) {
	var args = _.toArray(arguments);
	var errors = [];
	_.find(context.fieldNames, function (key) {
		var rule = this.rules[key];
		if (rule) {
			_.each(rule.errors.apply(rule, args), function (a) {
				errors.push(a);
			});
			if (shortCircut && errors.length) {
				return true;
			}
		}
	}, this);
	return errors;
};

CollectionRule = function (rules) {
	rules = _.toArray(arguments);
	rules = _.flatten(rules);
	this.rules = _.map(rules, function (rule) {
		if (typeof rule == 'object' && typeof rule.errors != 'function') {
			return new FieldsRule(rule);
		} else {
			return rule;
		}
	});
};

CollectionRule.makeContext = function(userId, doc, fieldNames, modifier) {
	var original = doc;
	if (modifier) {
		var c = new Meteor.Collection(null);

		// Note we don't really need the id, since any meteor provided doc
		// will have an id, but we do this incase the function is used
		// outside of collection.allow functions, for example in testing.
		var id = c.insert(doc);
		c.update(id, modifier);
		doc = c.findOne();
	}
	if (doc && !fieldNames && !modifier) {
		fieldNames = _.keys(doc);
	}
	return {
		doc: doc
		, original: original
		, userId: userId
		, fieldNames: fieldNames
		, modifier: modifier
	};
};

CollectionRule.allowInsert = function (collection, rules) {
	rules = _.toArray(arguments).slice(1);
	var rule = new CollectionRule(rules);
	collection.allow({
		insert: function (userId, doc) {
			return rule.allowable.apply(rule, arguments);
		}
	});
};

CollectionRule.allowUpdate = function (collection, rules) {
	rules = _.toArray(arguments).slice(1);
	var rule = new CollectionRule(rules);
	collection.allow({
		update: function (userId, doc, fieldNames, modifier) {
			return rule.allowable.apply(rule, arguments);
		}
	});
};

CollectionRule.allowRemove = function (collection, rules) {
	rules = _.toArray(arguments).slice(1);
	var rule = new CollectionRule(rules);
	collection.allow({
		remove: function (userId, doc) {
			return rule.allowable.apply(rule, arguments);
		}
	});
};

CollectionRule.attachSchema = function (collection, schema) {
	if (!(schema instanceof Schema)) schema = new Schema(schema);
	var rule = new CollectionRule(schema);
	collection.schema = schema;
	collection.deny({
		insert: function (userId, doc) {
			return !rule.allowable.apply(rule, arguments);
		}
		, update: function () {
			return !rule.allowable.apply(rule, arguments);
		}
	});
};

CollectionRule.prototype = _.clone(Rule.prototype);

CollectionRule.prototype.allow = function (doc, userId, fieldNames, modifier) {
	var context = CollectionRule.makeContext(doc, userId, fieldNames, modifier);
	return this.check(context.doc, context);
};

CollectionRule.prototype.allowable = function(doc, userId, fieldNames, modifier) {
	var context = CollectionRule.makeContext(doc, userId, fieldNames, modifier);
	return this.match(context.doc, context);
};

CollectionRule.prototype.allowErrors = function (doc, userId, fieldNames, modifier) {
	var context = CollectionRule.makeContext(doc, userId, fieldNames, modifier);
	return this.errors(context.doc, context);
};