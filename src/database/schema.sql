-- Database Schema for Mandi Price Tracker
-- Database: agrimatrix_prices

-- Drop existing tables if recreating
DROP TABLE IF EXISTS daily_prices CASCADE;
DROP TABLE IF EXISTS commodities CASCADE;
DROP TABLE IF EXISTS markets CASCADE;
DROP TABLE IF EXISTS districts CASCADE;
DROP TABLE IF EXISTS states CASCADE;
DROP TABLE IF EXISTS sync_logs CASCADE;

-- States table
CREATE TABLE states (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Districts table
CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    state_id INTEGER REFERENCES states(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(state_id, name)
);

-- Markets table
CREATE TABLE markets (
    id SERIAL PRIMARY KEY,
    district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(district_id, name)
);

-- Commodities table
CREATE TABLE commodities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    variety VARCHAR(100) NOT NULL DEFAULT 'Other',
    grade VARCHAR(50) NOT NULL DEFAULT 'FAQ',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, variety, grade)
);

-- Daily prices table
CREATE TABLE daily_prices (
    id SERIAL PRIMARY KEY,
    market_id INTEGER REFERENCES markets(id) ON DELETE CASCADE,
    commodity_id INTEGER REFERENCES commodities(id) ON DELETE CASCADE,
    arrival_date DATE NOT NULL,
    min_price DECIMAL(10, 2) NOT NULL,
    max_price DECIMAL(10, 2) NOT NULL,
    modal_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Unique constraint to prevent duplicate entries
    UNIQUE(market_id, commodity_id, arrival_date)
);

-- Sync logs table to track data fetching operations
CREATE TABLE sync_logs (
    id SERIAL PRIMARY KEY,
    sync_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    records_fetched INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'running',
    error_message TEXT,
    api_updated_date TIMESTAMP,
    duration_ms INTEGER
);

-- Indexes for better query performance
CREATE INDEX idx_daily_prices_arrival_date ON daily_prices(arrival_date DESC);
CREATE INDEX idx_daily_prices_market_id ON daily_prices(market_id);
CREATE INDEX idx_daily_prices_commodity_id ON daily_prices(commodity_id);
CREATE INDEX idx_daily_prices_market_commodity ON daily_prices(market_id, commodity_id, arrival_date DESC);

CREATE INDEX idx_markets_district_id ON markets(district_id);
CREATE INDEX idx_districts_state_id ON districts(state_id);
CREATE INDEX idx_commodities_name ON commodities(name);

CREATE INDEX idx_sync_logs_sync_date ON sync_logs(sync_date DESC);

-- Create a view for easy querying of latest prices with full details
CREATE OR REPLACE VIEW latest_prices_view AS
SELECT 
    s.name AS state,
    d.name AS district,
    m.name AS market,
    c.name AS commodity,
    c.variety,
    c.grade,
    dp.arrival_date,
    dp.min_price,
    dp.max_price,
    dp.modal_price,
    dp.created_at
FROM daily_prices dp
JOIN markets m ON dp.market_id = m.id
JOIN districts d ON m.district_id = d.id
JOIN states s ON d.state_id = s.id
JOIN commodities c ON dp.commodity_id = c.id
WHERE dp.arrival_date = (
    SELECT MAX(arrival_date) 
    FROM daily_prices dp2 
    WHERE dp2.market_id = dp.market_id 
    AND dp2.commodity_id = dp.commodity_id
);

-- Function to get latest price for a specific market-commodity combination
CREATE OR REPLACE FUNCTION get_latest_price(
    p_market_id INTEGER,
    p_commodity_id INTEGER
) RETURNS TABLE (
    arrival_date DATE,
    min_price DECIMAL,
    max_price DECIMAL,
    modal_price DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dp.arrival_date,
        dp.min_price,
        dp.max_price,
        dp.modal_price
    FROM daily_prices dp
    WHERE dp.market_id = p_market_id
    AND dp.commodity_id = p_commodity_id
    ORDER BY dp.arrival_date DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE states IS 'Master table for Indian states';
COMMENT ON TABLE districts IS 'Districts mapped to states';
COMMENT ON TABLE markets IS 'Markets/Mandis mapped to districts';
COMMENT ON TABLE commodities IS 'Agricultural commodities with variety and grade';
COMMENT ON TABLE daily_prices IS 'Daily price records from OpenGov API with duplicate prevention';
COMMENT ON TABLE sync_logs IS 'Audit log for data synchronization operations';
