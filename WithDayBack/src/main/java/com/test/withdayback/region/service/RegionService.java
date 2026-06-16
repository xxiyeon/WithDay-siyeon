package com.test.withdayback.region.service;

import com.test.withdayback.region.dao.RegionDao;
import com.test.withdayback.region.vo.DetailRegion;
import com.test.withdayback.region.vo.Region;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RegionService {

    @Autowired
    private RegionDao regionDao;

    public List<Region> getRegion() {
        List<Region> list = regionDao.getRegion();
        return list;
    }

    public List<DetailRegion> getDetailRegion(String regionName) {
        int regionId = regionDao.getRegionId(regionName);
        List<DetailRegion> list = regionDao.getDetailRegion(regionId);
        return list;
    }
}
