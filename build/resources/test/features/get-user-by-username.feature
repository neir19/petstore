Feature: Get a user by username

  Background:
    * url 'https://petstore.swagger.io/v2'

  @user
  Scenario: Get a user after creating it
    * def creation = call read('classpath:features/create-user.feature')
    * def createdUser = creation.createdUser
    Given path 'user', createdUser.username
    When method GET
    Then status 200
    And match response.username == createdUser.username
    And match response.firstName == createdUser.firstName
    And match response.lastName == createdUser.lastName
    And match response.email == createdUser.email
    And match response.phone == createdUser.phone
