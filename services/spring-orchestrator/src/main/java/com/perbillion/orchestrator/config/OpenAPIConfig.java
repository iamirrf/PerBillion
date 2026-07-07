package com.perbillion.orchestrator.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenAPIConfig {

    @Value("${server.port:8080}")
    private String serverPort;

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("PerBillion API")
                .version("1.0.0")
                .description("Institution-grade stock forecasting platform with classical time series models")
                .contact(new Contact()
                    .name("PerBillion")
                    .email("support@perbillion.com")
                    .url("https://perbillion.com"))
                .license(new License()
                    .name("Proprietary")
                    .url("https://perbillion.com/license")))
            .servers(List.of(
                new Server()
                    .url("http://localhost:" + serverPort)
                    .description("Local Development Server"),
                new Server()
                    .url("https://api.perbillion.com")
                    .description("Production Server")
            ));
    }
}
