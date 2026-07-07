package com.perbillion.orchestrator.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Forecast response")
public class ForecastResponse {

    @Schema(description = "Forecast ID")
    private String forecastId;

    @Schema(description = "User ID")
    private String userId;

    @Schema(description = "Stock ticker")
    private String ticker;

    @Schema(description = "Forecast status", example = "completed")
    private String status;

    @Schema(description = "Model type used")
    private String modelType;

    @Schema(description = "Model parameters")
    private Map<String, Object> parameters;

    @Schema(description = "Forecast data with predictions and confidence intervals")
    private Map<String, Object> forecastData;

    @Schema(description = "Model metrics")
    private Map<String, Object> metrics;

    @Schema(description = "Diagnostic information")
    private Map<String, Object> diagnostics;

    @Schema(description = "Plain-English interpretation")
    private String interpretation;

    @Schema(description = "Error message if status is failed")
    private String errorMessage;

    @Schema(description = "Creation timestamp")
    private Instant createdAt;

    @Schema(description = "Completion timestamp")
    private Instant completedAt;

    @Schema(description = "Tuning summary")
    private Map<String, Object> tuningSummary;
}
