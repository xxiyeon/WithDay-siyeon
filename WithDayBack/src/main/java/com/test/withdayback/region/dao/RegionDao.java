package com.test.withdayback.region.dao;

import com.test.withdayback.region.vo.DetailRegion;
import com.test.withdayback.region.vo.Region;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface RegionDao {
    List<Region> getRegion();

    int getRegionId(String regionName);

    List<DetailRegion> getDetailRegion(int regionId);
}
