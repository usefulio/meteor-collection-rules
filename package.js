Package.describe({
  summary: "REPLACEME - What does this package (or the original one you're wrapping) do?"
});

Package.on_use(function (api, where) {
  api.use(['rules', 'underscore']);

  api.add_files('collection-rules.js', ['client', 'server']);

  api.export('CollectionRule');
});

Package.on_test(function (api) {
  api.use('collection-rules');

  api.use(['autopublish', 'schema', 'rules', 'tinytest', 'test-helpers']);

  api.add_files('collection-rules_tests.js', ['client', 'server']);
});
