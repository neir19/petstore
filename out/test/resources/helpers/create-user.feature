Feature: Create a user fixture

  Scenario: Create a uniquely named user for a test scenario
    * def createdUser = read('classpath:data/user.json')
    * def username = 'qa_' + java.util.UUID.randomUUID().toString().replace('-', '').substring(0, 12)
    * set createdUser.username = username
    * set createdUser.email = username + '@example.test'
    Given url baseUrl
    And path 'user'
    And request createdUser
    When method POST
    Then status 200
    And match response.code == 200
    And match response.type == '#string'
    And match response.message == '#string'
