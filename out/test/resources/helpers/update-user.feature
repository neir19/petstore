Feature: Update user fixture

  Scenario: Update name and email, preserving the other user fields
    * def originalUser = user
    Given url baseUrl
    And path 'user', originalUser.username
    When method GET
    Then status 200
    And match response.username == originalUser.username
    * def updatedUser = response
    * set updatedUser.firstName = firstName
    * set updatedUser.email = email
    Given path 'user', originalUser.username
    And request updatedUser
    When method PUT
    Then status 200
    And match response.code == 200
    And match response.type == '#string'
    And match response.message == '#string'
