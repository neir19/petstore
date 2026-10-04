Feature: Delete user fixture

  Scenario: Delete a user created as a test precondition
    Given url baseUrl
    And path 'user', user.username
    When method DELETE
    Then status 200
    And match response.code == 200
    And match response.type == '#string'
    And match response.message == user.username
