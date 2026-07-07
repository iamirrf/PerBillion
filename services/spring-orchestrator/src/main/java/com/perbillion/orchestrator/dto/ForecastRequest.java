package com.perbillion.orchestrator.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Schema(description = "Forecast request")
public class ForecastRequest {

    @NotBlank(message = "User ID is required")
    @Schema(description = "User ID", example = "123e4567-e89b-12d3-a456-426614174000")
    private String userId;

    @NotBlank(message = "Ticker is required")
    @Pattern(regexp = "^[A-Z]{1,5}$", message = "Ticker must be 1-5 uppercase letters")
    @Schema(description = "Stock ticker symbol", example = "AAPL")
    private String ticker;

    @Schema(description = "Historical price data as [date, price] pairs (optional - will be fetched automatically if not provided)")
    private List<List<Object>> data;

    @Min(value = 1, message = "Forecast horizon must be at least 1")
    @Max(value = 52, message = "Forecast horizon cannot exceed 52 weeks")
    @Schema(description = "Number of periods to forecast", example = "12", defaultValue = "12")
    private Integer forecastHorizon = 12;

    @Pattern(regexp = "^(auto|ARIMA|SARIMA|SARIMAX|HOLT_WINTERS_ADDITIVE|HOLT_WINTERS_MULTIPLICATIVE|HOLT_WINTERS_DAMPED)$",
            message = "Invalid model type")
    @Schema(description = "Model type for forecasting", example = "auto", defaultValue = "auto")
    private String modelType = "auto";

    @Schema(description = "Exogenous variables data (optional)")
    private List<List<Object>> exogenousData;

    @Schema(description = "Advanced configuration options (optional)")
    private Map<String, Object> advancedConfig;
}
