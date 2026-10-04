Feature: Update a user by username

  Background:
    * url 'https://petstore.swagger.io/v2'

  @user
  Scenario: Update an existing user
    * def creation = call read('classpath:features/create-user.feature')
    * def createdUser = creation.createdUser
    * def updatedUser =
      """
      {
        "id": 0,
        "username": "#(createdUser.username)",
        "firstName": "Updated",
        "lastName": "User",
        "email": "#(createdUser.username + '@updated.example.com')",
        "password": "NewPassw0rd!",
        "phone": "5559876543",
        "userStatus": 1
      }
      """
    Given path 'user', createdUser.username
    And request updatedUser
    When method PUT
    Then status 200
    And match response.code == 200
    And match response.type == '#string'
    And match response.message == '#string'
