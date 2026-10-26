package com.perbillion.orchestrator.repository;

import com.perbillion.orchestrator.model.Forecast;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.time.Instant;
import java.util.Collection;
import java.util.List;

@Repository
public interface ForecastRepository extends MongoRepository<Forecast, String> {
    
    Page<Forecast> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    Page<Forecast> findByUserIdAndTickerOrderByCreatedAtDesc(String userId, String ticker, Pageable pageable);
    
    Page<Forecast> findByTickerOrderByCreatedAtDesc(String ticker, Pageable pageable);
    
    Page<Forecast> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    List<Forecast> findByStatusInAndCreatedAtBefore(Collection<String> statuses, Instant createdBefore);
}
