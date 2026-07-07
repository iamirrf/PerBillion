package com.perbillion.orchestrator.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.Instant;
import java.util.Map;

@Data
@Document(collection = "forecasts")
public class Forecast {

    @Id
    private String id;

    @Indexed
    @Field("user_id")
    private String userId;

    @Indexed
    private String ticker;

    @Indexed
    private String status; // pending, running, completed, failed

    @Field("model_type")
    private String modelType;

    private Map<String, Object> parameters;

    @Field("forecast_data")
    private Map<String, Object> forecastData;

    @Field("historical_data")
    private Map<String, Object> historicalData;

    private Map<String, Object> metrics;

    private Map<String, Object> diagnostics;

    private String interpretation;

    private String errorMessage;

    @Indexed
    @Field("created_at")
    private Instant createdAt;

    @Field("completed_at")
    private Instant completedAt;

    @Field("tuning_summary")
    private Map<String, Object> tuningSummary;
}
