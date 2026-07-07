package com.perbillion.orchestrator.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DataFetchService {

    @Value("${alphavantage.api.key}")
    private String alphaVantageApiKey;

    private final WebClient.Builder webClientBuilder;
    
    private static final String ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co";

    /**
     * Fetch historical stock data from Alpha Vantage
     * Returns weekly adjusted stock prices
     * 
     * @param ticker Stock ticker symbol (e.g., AAPL, GOOGL)
     * @param startDate Start date for historical data
     * @param endDate End date for historical data
     * @return List of [date, price] pairs sorted by date ascending
     */
    public List<List<Object>> fetchHistoricalData(String ticker, LocalDate startDate, LocalDate endDate) {
        log.info("Fetching historical data for {} from {} to {}", ticker, startDate, endDate);
        
        try {
            WebClient webClient = webClientBuilder.baseUrl(ALPHA_VANTAGE_BASE_URL).build();
            
            // Call Alpha Vantage API for weekly adjusted data
            Map<String, Object> response = webClient.get()
                .uri(uriBuilder -> uriBuilder
                    .path("/query")
                    .queryParam("function", "TIME_SERIES_WEEKLY_ADJUSTED")
                    .queryParam("symbol", ticker)
                    .queryParam("apikey", alphaVantageApiKey)
                    .build())
                .retrieve()
                .bodyToMono(Map.class)
                .block();

            if (response == null || !response.containsKey("Weekly Adjusted Time Series")) {
                log.warn("No data returned from Alpha Vantage for ticker: {}", ticker);
                return new ArrayList<>();
            }

            // Parse and transform the response
            Map<String, Map<String, String>> timeSeries = 
                (Map<String, Map<String, String>>) response.get("Weekly Adjusted Time Series");

            List<List<Object>> dataPoints = new ArrayList<>();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

            for (Map.Entry<String, Map<String, String>> entry : timeSeries.entrySet()) {
                LocalDate date = LocalDate.parse(entry.getKey(), formatter);
                
                // Filter by date range
                if ((startDate == null || !date.isBefore(startDate)) && 
                    (endDate == null || !date.isAfter(endDate))) {
                    
                    // Use adjusted close price
                    double price = Double.parseDouble(entry.getValue().get("5. adjusted close"));
                    dataPoints.add(Arrays.asList(entry.getKey(), price));
                }
            }

            // Sort by date ascending (oldest first)
            dataPoints.sort(Comparator.comparing(list -> (String) list.get(0)));

            log.info("Successfully fetched {} data points for {}", dataPoints.size(), ticker);
            return dataPoints;

        } catch (Exception e) {
            log.error("Error fetching data from Alpha Vantage for ticker {}: {}", ticker, e.getMessage());
            throw new RuntimeException("Failed to fetch historical data for " + ticker, e);
        }
    }

    /**
     * Validate ticker symbol exists by attempting a quote lookup
     * 
     * @param ticker Stock ticker symbol
     * @return true if ticker is valid and exists
     */
    public boolean validateTicker(String ticker) {
        if (ticker == null || !ticker.matches("^[A-Z]{1,5}$")) {
            return false;
        }

        try {
            WebClient webClient = webClientBuilder.baseUrl(ALPHA_VANTAGE_BASE_URL).build();
            
            Map<String, Object> response = webClient.get()
                .uri(uriBuilder -> uriBuilder
                    .path("/query")
                    .queryParam("function", "GLOBAL_QUOTE")
                    .queryParam("symbol", ticker)
                    .queryParam("apikey", alphaVantageApiKey)
                    .build())
                .retrieve()
                .bodyToMono(Map.class)
                .block();

            // Check if we got a valid response with quote data
            if (response != null && response.containsKey("Global Quote")) {
                Map<String, String> quote = (Map<String, String>) response.get("Global Quote");
                return quote != null && !quote.isEmpty();
            }

            return false;

        } catch (Exception e) {
            log.error("Error validating ticker {}: {}", ticker, e.getMessage());
            return false;
        }
    }

    /**
     * Search for ticker symbols by company name or partial ticker
     * 
     * @param keywords Search keywords
     * @return List of matching ticker symbols with company names
     */
    public List<Map<String, String>> searchTickers(String keywords) {
        try {
            WebClient webClient = webClientBuilder.baseUrl(ALPHA_VANTAGE_BASE_URL).build();
            
            Map<String, Object> response = webClient.get()
                .uri(uriBuilder -> uriBuilder
                    .path("/query")
                    .queryParam("function", "SYMBOL_SEARCH")
                    .queryParam("keywords", keywords)
                    .queryParam("apikey", alphaVantageApiKey)
                    .build())
                .retrieve()
                .bodyToMono(Map.class)
                .block();

            if (response != null && response.containsKey("bestMatches")) {
                List<Map<String, String>> matches = (List<Map<String, String>>) response.get("bestMatches");
                return matches.stream()
                    .map(match -> {
                        Map<String, String> result = new HashMap<>();
                        result.put("ticker", match.get("1. symbol"));
                        result.put("name", match.get("2. name"));
                        result.put("type", match.get("3. type"));
                        result.put("region", match.get("4. region"));
                        return result;
                    })
                    .collect(Collectors.toList());
            }

            return new ArrayList<>();

        } catch (Exception e) {
            log.error("Error searching for tickers with keywords '{}': {}", keywords, e.getMessage());
            return new ArrayList<>();
        }
    }
}
