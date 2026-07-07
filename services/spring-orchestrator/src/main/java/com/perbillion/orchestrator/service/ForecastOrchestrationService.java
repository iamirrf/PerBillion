package com.perbillion.orchestrator.service;

import com.perbillion.orchestrator.dto.ForecastRequest;
import com.perbillion.orchestrator.dto.ForecastResponse;
import com.perbillion.orchestrator.model.Forecast;
import com.perbillion.orchestrator.repository.ForecastRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ForecastOrchestrationService {

    private final ForecastRepository forecastRepository;
    private final WebClient mlEngineClient;
    private final DataFetchService dataFetchService;

    @Transactional
    public ForecastResponse createForecast(ForecastRequest request) {
        // Create forecast document
        Forecast forecast = new Forecast();
        forecast.setId(UUID.randomUUID().toString());
        forecast.setUserId(request.getUserId());
        forecast.setTicker(request.getTicker());
        forecast.setStatus("pending");
        forecast.setModelType(request.getModelType());
        forecast.setCreatedAt(Instant.now());
        
        // Save initial forecast
        forecast = forecastRepository.save(forecast);
        
        // Trigger ML processing asynchronously
        final String forecastId = forecast.getId();
        processForecastAsync(forecastId, request);
        
        return mapToResponse(forecast);
    }

    private void processForecastAsync(String forecastId, ForecastRequest request) {
        new Thread(() -> {
            try {
                // Update status
                updateForecastStatus(forecastId, "running");
                
                // Fetch historical data if not provided
                List<List<Object>> data = request.getData();
                if (data == null || data.isEmpty()) {
                    log.info("Fetching historical data for ticker: {}", request.getTicker());
                    // Fetch last 2 years of weekly data
                    java.time.LocalDate endDate = java.time.LocalDate.now();
                    java.time.LocalDate startDate = endDate.minusYears(2);
                    data = dataFetchService.fetchHistoricalData(request.getTicker(), startDate, endDate);
                    
                    if (data == null || data.isEmpty()) {
                        throw new RuntimeException("No historical data available for ticker: " + request.getTicker());
                    }
                }
                
                // Call ML engine
                Map<String, Object> mlRequest = buildMlRequest(request, data);
                
                Map<String, Object> mlResponse = mlEngineClient
                    .post()
                    .uri("/api/forecast")
                    .bodyValue(mlRequest)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
                
                // Update forecast with results
                updateForecastWithResults(forecastId, mlResponse);
                
            } catch (Exception e) {
                log.error("Forecast processing failed: {}", e.getMessage(), e);
                updateForecastStatus(forecastId, "failed", e.getMessage());
            }
        }).start();
    }

    private Map<String, Object> buildMlRequest(ForecastRequest request, List<List<Object>> data) {
        Map<String, Object> mlRequest = new HashMap<>();
        mlRequest.put("ticker", request.getTicker());
        mlRequest.put("data", data);
        mlRequest.put("forecast_horizon", request.getForecastHorizon());
        mlRequest.put("model_type", request.getModelType());
        
        if (request.getExogenousData() != null) {
            mlRequest.put("exogenous_data", request.getExogenousData());
        }
        
        if (request.getAdvancedConfig() != null) {
            mlRequest.put("advanced_config", request.getAdvancedConfig());
        }
        
        return mlRequest;
    }

    private void updateForecastStatus(String forecastId, String status) {
        updateForecastStatus(forecastId, status, null);
    }

    private void updateForecastStatus(String forecastId, String status, String errorMessage) {
        Forecast forecast = forecastRepository.findById(forecastId)
            .orElseThrow(() -> new RuntimeException("Forecast not found: " + forecastId));
        
        forecast.setStatus(status);
        if (errorMessage != null) {
            forecast.setErrorMessage(errorMessage);
        }
        
        if ("completed".equals(status) || "failed".equals(status)) {
            forecast.setCompletedAt(Instant.now());
        }
        
        forecastRepository.save(forecast);
    }

    @SuppressWarnings("unchecked")
    private void updateForecastWithResults(String forecastId, Map<String, Object> mlResponse) {
        Forecast forecast = forecastRepository.findById(forecastId)
            .orElseThrow(() -> new RuntimeException("Forecast not found: " + forecastId));

        Map<String, Object> sanitizedResponse = sanitizeForMongo(mlResponse);

        Object statusObj = sanitizedResponse.get("status");
        String status = statusObj != null ? statusObj.toString() : "failed";
        forecast.setStatus(status);

        Object modelTypeObj = sanitizedResponse.get("model_type");
        if (modelTypeObj != null) {
            forecast.setModelType(modelTypeObj.toString());
        }

        Object paramsObj = sanitizedResponse.get("parameters");
        if (paramsObj instanceof Map) {
            forecast.setParameters((Map<String, Object>) paramsObj);
        }

        Object forecastDataObj = sanitizedResponse.get("forecast_data");
        if (forecastDataObj instanceof Map) {
            forecast.setForecastData((Map<String, Object>) forecastDataObj);
        }

        Object metricsObj = sanitizedResponse.get("metrics");
        if (metricsObj instanceof Map) {
            forecast.setMetrics((Map<String, Object>) metricsObj);
        }

        Object diagnosticsObj = sanitizedResponse.get("diagnostics");
        if (diagnosticsObj instanceof Map) {
            forecast.setDiagnostics((Map<String, Object>) diagnosticsObj);
        }

        Object interpretationObj = sanitizedResponse.get("interpretation");
        if (interpretationObj != null) {
            forecast.setInterpretation(interpretationObj.toString());
        }

        Object tuningSummaryObj = sanitizedResponse.get("tuning_summary");
        if (tuningSummaryObj instanceof Map) {
            forecast.setTuningSummary((Map<String, Object>) tuningSummaryObj);
        }

        Object errorMessageObj = sanitizedResponse.get("error_message");
        if (errorMessageObj != null) {
            forecast.setErrorMessage(errorMessageObj.toString());
        }

        forecast.setCompletedAt(Instant.now());
        
        forecastRepository.save(forecast);
    }

    private Map<String, Object> sanitizeForMongo(Map<String, Object> input) {
        if (input == null) {
            return null;
        }
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : input.entrySet()) {
            String key = sanitizeMongoKey(entry.getKey());
            out.put(key, sanitizeForMongoValue(entry.getValue()));
        }
        return out;
    }

    private Object sanitizeForMongoValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Map<?, ?> mapVal) {
            Map<String, Object> converted = new LinkedHashMap<>();
            for (Map.Entry<?, ?> e : mapVal.entrySet()) {
                String key = sanitizeMongoKey(String.valueOf(e.getKey()));
                converted.put(key, sanitizeForMongoValue(e.getValue()));
            }
            return converted;
        }
        if (value instanceof List<?> listVal) {
            List<Object> converted = new ArrayList<>(listVal.size());
            for (Object item : listVal) {
                converted.add(sanitizeForMongoValue(item));
            }
            return converted;
        }
        return value;
    }

    private String sanitizeMongoKey(String key) {
        if (key == null) {
            return "";
        }
        // MongoDB does not allow dots in field names and generally discourages '$'.
        // Replace dots with underscores and strip leading '$' to prevent persistence failures.
        String sanitized = key.replace(".", "_");
        while (sanitized.startsWith("$")) {
            sanitized = sanitized.substring(1);
        }
        return sanitized;
    }

    public ForecastResponse getForecast(String forecastId) {
        Forecast forecast = forecastRepository.findById(forecastId)
            .orElseThrow(() -> new RuntimeException("Forecast not found: " + forecastId));
        
        return mapToResponse(forecast);
    }

    public Page<ForecastResponse> getUserForecasts(UUID userId, int page, int size) {
        Page<Forecast> forecasts = forecastRepository.findByUserIdOrderByCreatedAtDesc(
            userId.toString(), PageRequest.of(page, size)
        );
        
        return forecasts.map(this::mapToResponse);
    }

    public Page<ForecastResponse> getTickerForecasts(String ticker, int page, int size) {
        Page<Forecast> forecasts = forecastRepository.findByTickerOrderByCreatedAtDesc(
            ticker, PageRequest.of(page, size)
        );
        
        return forecasts.map(this::mapToResponse);
    }

    public void deleteForecast(String forecastId) {
        forecastRepository.deleteById(forecastId);
    }

    private ForecastResponse mapToResponse(Forecast forecast) {
        return ForecastResponse.builder()
            .forecastId(forecast.getId())
            .userId(forecast.getUserId())
            .ticker(forecast.getTicker())
            .status(forecast.getStatus())
            .modelType(forecast.getModelType())
            .parameters(forecast.getParameters())
            .forecastData(forecast.getForecastData())
            .metrics(forecast.getMetrics())
            .diagnostics(forecast.getDiagnostics())
            .interpretation(forecast.getInterpretation())
            .errorMessage(forecast.getErrorMessage())
            .createdAt(forecast.getCreatedAt())
            .completedAt(forecast.getCompletedAt())
            .tuningSummary(forecast.getTuningSummary())
            .build();
    }
}
