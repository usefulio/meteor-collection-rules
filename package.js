Package.describe({
  summary: "Provides a set of helper methods for using the rules package for collection access (i.e. allow deny rules)."
  , version: "0.1.0"
  , name: "cwohlman:collection-rules"
  , git: "https://github.com/cwohlman/meteor-collection-rules.git"
});

Package.on_use(function (api, where) {
  api.use(['cwohlman:rules', 'cwohlman:schema', 'underscore']);

  api.add_files('collection-rules.js', ['client', 'server']);

  api.export('CollectionRules');
});

Package.on_test(function (api) {
  api.use('cwohlman:collection-rules');

  api.use(['autopublish', 'schema', 'rules', 'tinytest', 'test-helpers']);

  api.add_files('collection-rules_tests.js', ['client', 'server']);
});
