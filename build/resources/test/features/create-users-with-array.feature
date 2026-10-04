Feature: Create users with an array

  Background:
    * url 'https://petstore.swagger.io/v2'
    * def userSuffix = java.util.UUID.randomUUID().toString().substring(0, 8)

  @user
  Scenario: Create users using createWithArray
    * def users =
      """
      [
        {
          "id": 0,
          "username": "#('karate_' + userSuffix)",
          "firstName": "Test",
          "lastName": "User",
          "email": "#('karate_' + userSuffix + '@example.com')",
          "password": "Passw0rd!",
          "phone": "5551234567",
          "userStatus": 0
        }
      ]
      """
    Given path 'user', 'createWithArray'
    And request users
    When method POST
    Then status 200
    And match response.code == 200
    And match response.type == '#string'
    And match response.message == '#string'
