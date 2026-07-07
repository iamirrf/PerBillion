package com.perbillion.orchestrator.controller;

import com.perbillion.orchestrator.dto.ForecastRequest;
import com.perbillion.orchestrator.dto.ForecastResponse;
import com.perbillion.orchestrator.service.DataFetchService;
import com.perbillion.orchestrator.service.ForecastOrchestrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/forecasts")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Forecast Orchestration", description = "Forecast creation and management endpoints")
public class ForecastController {

    private final ForecastOrchestrationService orchestrationService;
    private final DataFetchService dataFetchService;

    @PostMapping
    @Operation(summary = "Create a new forecast", description = "Creates a new forecast job and triggers ML processing")
    public ResponseEntity<ForecastResponse> createForecast(@Valid @RequestBody ForecastRequest request) {
        log.info("Received forecast request for ticker: {}", request.getTicker());
        
        ForecastResponse response = orchestrationService.createForecast(request);
        
        return ResponseEntity.accepted().body(response);
    }

    @PostMapping("/generate")
    @Operation(summary = "Generate forecast with auto data fetch", description = "Simplified endpoint that fetches data automatically")
    public ResponseEntity<ForecastResponse> generateForecast(@RequestBody Map<String, Object> simpleRequest) {
        String ticker = (String) simpleRequest.get("ticker");
        String userId = (String) simpleRequest.getOrDefault("userId", "anonymous");
        String modelType = (String) simpleRequest.getOrDefault("modelType", "auto");
        
        // Accept both "forecastHorizon" and "periods" field names
        Object periodsObj = simpleRequest.getOrDefault("forecastHorizon", simpleRequest.getOrDefault("periods", 12));
        Integer periods = periodsObj instanceof Integer ? 
            (Integer) periodsObj : 
            Integer.parseInt(periodsObj.toString());
        
        log.info("Generating forecast for ticker: {} with {} periods (user: {})", ticker, periods, userId);
        
        // Fetch historical data
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusYears(3); // 3 years of historical data
        List<List<Object>> historicalData = dataFetchService.fetchHistoricalData(ticker, startDate, endDate);
        
        if (historicalData.isEmpty()) {
            throw new RuntimeException("No historical data found for ticker: " + ticker);
        }
        
        // Build full forecast request
        ForecastRequest request = new ForecastRequest();
        request.setUserId(userId);
        request.setTicker(ticker.toUpperCase());
        request.setData(historicalData);
        request.setForecastHorizon(periods);
        request.setModelType(modelType);
        
        // Add advanced config if provided
        if (simpleRequest.containsKey("advancedConfig")) {
            request.setAdvancedConfig((Map<String, Object>) simpleRequest.get("advancedConfig"));
        }
        
        ForecastResponse response = orchestrationService.createForecast(request);
        
        return ResponseEntity.accepted().body(response);
    }

    @GetMapping("/{forecastId}")
    @Operation(summary = "Get forecast by ID", description = "Retrieves a forecast by its unique identifier")
    public ResponseEntity<ForecastResponse> getForecast(@PathVariable String forecastId) {
        log.info("Retrieving forecast: {}", forecastId);
        
        ForecastResponse response = orchestrationService.getForecast(forecastId);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get user forecasts", description = "Retrieves all forecasts for a specific user")
    public ResponseEntity<?> getUserForecasts(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        log.info("Retrieving forecasts for user: {}", userId);
        
        var forecasts = orchestrationService.getUserForecasts(userId, page, size);
        
        return ResponseEntity.ok(forecasts);
    }

    @GetMapping("/ticker/{ticker}")
    @Operation(summary = "Get forecasts by ticker", description = "Retrieves all forecasts for a specific ticker")
    public ResponseEntity<?> getTickerForecasts(
            @PathVariable String ticker,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        log.info("Retrieving forecasts for ticker: {}", ticker);
        
        var forecasts = orchestrationService.getTickerForecasts(ticker, page, size);
        
        return ResponseEntity.ok(forecasts);
    }

    @DeleteMapping("/{forecastId}")
    @Operation(summary = "Delete forecast", description = "Deletes a forecast by ID")
    public ResponseEntity<Void> deleteForecast(@PathVariable String forecastId) {
        log.info("Deleting forecast: {}", forecastId);
        
        orchestrationService.deleteForecast(forecastId);
        
        return ResponseEntity.noContent().build();
    }
}
