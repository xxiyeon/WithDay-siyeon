package com.test.withdayback.region.controller;

import com.test.withdayback.region.dao.RegionDao;
import com.test.withdayback.region.service.RegionService;
import com.test.withdayback.region.vo.DetailRegion;
import com.test.withdayback.region.vo.Region;
import com.test.withdayback.schedule.dto.ScheduleResponseDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/region")
@CrossOrigin("*")
public class RegionController {

    @Autowired
    private RegionService regionService;

    @GetMapping(value = "")
    public ResponseEntity<List<Region>> getRegion() {
        List<Region> list = regionService.getRegion();
        return ResponseEntity.ok(list);
    }

    @GetMapping(value = "/detail-region")
    public ResponseEntity<List<DetailRegion>> getDetailRegion(@RequestParam("regionName") String regionName) {
        List<DetailRegion> list = regionService.getDetailRegion(regionName);
        return ResponseEntity.ok(list);
    }
}
