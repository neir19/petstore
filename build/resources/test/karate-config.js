function fn() {
  var config = {
    baseUrl: 'https://opencart.abstracta.us/',
    commonHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    randomUsername: 'user_' + java.util.UUID.randomUUID().toString()
  };

  return config;
}
