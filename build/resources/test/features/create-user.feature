Feature: Create a user in Petstore

  Background:
    * url 'https://petstore.swagger.io/v2'
    * def username = 'karate_' + java.util.UUID.randomUUID().toString().substring(0, 8)

  @user
  Scenario: Create user
    * def user =
      """
      {
        "id": 0,
        "username": "#(username)",
        "firstName": "Test",
        "lastName": "User",
        "email": "#(username + '@example.com')",
        "password": "Passw0rd!",
        "phone": "5551234567",
        "userStatus": 0
      }
      """
    * print 'Usuario generado:', user
    Given path 'user'
    And request user
    When method POST
    Then status 200
    And match response.code == 200
    And match response.type == '#string'
    And match response.message == '#string'
    * def createdUser = user



