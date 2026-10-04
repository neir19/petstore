package runners;

import com.intuit.karate.junit5.Karate;

class UserTest {

    @Karate.Test
    Karate userLifecycle() {
        String tag = System.getProperty("karate.tags", "@user");
        return Karate.run("classpath:features/user/user-lifecycle.feature").tags(tag);
    }
}
