package com.perbillion.orchestrator.repository;

import com.perbillion.orchestrator.model.Forecast;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ForecastRepository extends MongoRepository<Forecast, String> {
    
    Page<Forecast> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    
    Page<Forecast> findByTickerOrderByCreatedAtDesc(String ticker, Pageable pageable);
    
    Page<Forecast> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
}
