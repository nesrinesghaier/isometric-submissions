var Iso, callback, config, loadIso, observer, targetNode;

Iso = (function () {
  var COLORS, averageCount, bestDay, contributionsBox, dateOptions, dateWithYearOptions, firstDay, lastDay, maxCount,
    yearTotal;

  class Iso {
    constructor(target) {
      var graphContainer, observer;
      if (target) {
        graphContainer = ($('#cal-heatmap')).parent()[0];
        if (graphContainer) {
          observer = new MutationObserver((mutations) => {
            var isGraphAdded;
            isGraphAdded = mutations.find(function (mutation) {
              return [].find.call(mutation.addedNodes, function (node) {
                return node.className === "cal-heatmap";
              });
            });
            if (isGraphAdded) {
              return this.generateIsometricChart();
            }
          });
          observer.observe(graphContainer, {
            childList: true
          });
        }
        this.getSettings(() => {
          return this.generateIsometricChart();
        });
      }
    }

    getSettings(callback) {
      var ref, ref1;
      // Check for user preference, if chrome.storage is available.
      // The storage API is not supported in content scripts.
      // https://developer.mozilla.org/Add-ons/WebExtensions/Chrome_incompatibilities#storage
      if ((typeof chrome !== "undefined" && chrome !== null ? chrome.storage : void 0) != null) {
        return chrome.storage.local.get(['toggleSetting', 'show2DSetting'], ({toggleSetting, show2DSetting}) => {
          this.toggleSetting = toggleSetting != null ? toggleSetting : 'cubes';
          this.show2DSetting = show2DSetting != null ? show2DSetting : 'no';
          return callback();
        });
      } else {
        this.toggleSetting = (ref = localStorage.toggleSetting) != null ? ref : 'cubes';
        this.show2DSetting = (ref1 = localStorage.show2DSetting) != null ? ref1 : 'no';
        return callback();
      }
    }

    persistSetting(key, value, callback = function () {
    }) {
      var obj;
      if ((typeof chrome !== "undefined" && chrome !== null ? chrome.storage : void 0) != null) {
        obj = {};
        obj[key] = value;
        return chrome.storage.local.set(obj, callback);
      } else {
        localStorage[key] = value;
        return callback();
      }
    }

    generateIsometricChart() {
      this.resetValues();
      this.initUI();
      this.loadStats();
      return this.renderIsometricChart();
    }

    resetValues() {
      yearTotal = 0;
      averageCount = 0;
      maxCount = 0;
      bestDay = null;
      firstDay = null;
      lastDay = null;
      return contributionsBox = null;
    }

    initUI() {
      var htmlFooter, htmlToggle, insertLocation;
      ($('<div class="ic-submissions-wrapper"></div>')).insertBefore($('#cal-heatmap'));
      ($('<canvas id="isometric-submissions" width="720" height="410"></canvas>')).appendTo('.ic-submissions-wrapper');
      contributionsBox = $('#cal-heatmap');
      insertLocation = ($('#cal-heatmap'));
      // Inject toggle
      htmlToggle = "<span class=\"ic-toggle\">\n  <a href=\"#\" class=\"ic-toggle-option tooltipped tooltipped-nw squares\" data-ic-option=\"squares\" aria-label=\"Normal chart view\"></a>\n  <a href=\"#\" class=\"ic-toggle-option tooltipped tooltipped-nw cubes\" data-ic-option=\"cubes\" aria-label=\"Isometric chart view\"></a>\n</span>";
      ($(htmlToggle)).insertBefore(insertLocation);
      // Inject footer w/ toggle for showing 2D chart
      htmlFooter = "<span class=\"ic-footer\">\n  <a href=\"#\" class=\"ic-2d-toggle\">Show normal chart below ▾</a>\n</span>";
      ($(htmlFooter)).appendTo($('.ic-submissions-wrapper'));
      return this.observeToggle();
    }

    observeToggle() {
      var self;
      self = this;
      ($('.ic-toggle-option')).click(function (e) {
        var option;
        e.preventDefault();
        option = ($(this)).data('ic-option');
        if (option === 'squares') {
          (contributionsBox.removeClass('ic-cubes')).addClass('ic-squares');
        } else {
          (contributionsBox.removeClass('ic-squares')).addClass('ic-cubes');
        }
        ($('.ic-toggle-option')).removeClass('active');
        ($(this)).addClass('active');
        self.persistSetting("toggleSetting", option);
        return self.toggleSetting = option;
      });
      // Apply user preference
      ($(`.ic-toggle-option.${this.toggleSetting}`)).addClass('active');
      contributionsBox.addClass(`ic-${this.toggleSetting}`);
      ($('.ic-2d-toggle')).click(function (e) {
        e.preventDefault();
        if (contributionsBox.hasClass('show-2d')) {
          ($(this)).text('Show normal chart ▾');
          contributionsBox.removeClass('show-2d');
          self.persistSetting("show2DSetting", 'no');
          return self.show2DSetting = 'no';
        } else {
          ($(this)).text('Hide normal chart ▴');
          contributionsBox.addClass('show-2d');
          self.persistSetting("show2DSetting", 'yes');
          return self.show2DSetting = 'yes';
        }
      });
      // Apply user preference
      if (this.show2DSetting === "yes") {
        contributionsBox.addClass('show-2d');
        return ($('.ic-2d-toggle')).text('Hide normal chart ▴');
      } else {
        contributionsBox.removeClass('show-2d');
        return ($('.ic-2d-toggle')).text('Show normal chart ▾');
      }
    }

    getDateOfISOWeek(w, y) {
      var simple = new Date(y, 0, 1 + (w - 1) * 7);
      var dow = simple.getDay();
      var ISOweekStart = simple;
      if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
      else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
      return ISOweekStart.toDateString();
    }

    formatDate(date, dayIndex) {
      var d = new Date(date);
      d.setDate(d.getDate() + dayIndex);
      var month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();
      if (month.length < 2)
        month = '0' + month;
      if (day.length < 2)
        day = '0' + day;

      return [year, month, day].join('-');
    }

    getRectCount(d) {
      let currentDayCount, currentDayClassString, currentDayResult;
      currentDayClassString = d.children[0].className['baseVal'].toLocaleString();
      currentDayResult = currentDayClassString.match(/q\d/);
      currentDayCount = currentDayResult == null ? 0 : parseInt(currentDayResult[0][1]);
      return currentDayCount;
    }

    getRectDate(d) {
      let currentWeekClassString, currentWeekResult, currentWeekIndex, currentYearResult, currentYear;
      currentWeekClassString = d.parentElement.parentElement.className['baseVal'].toLocaleString();
      currentWeekResult = currentWeekClassString.match(/w_[0-9]{1,}/);
      currentYearResult = currentWeekClassString.match(/y_[0-9]{4,}/);
      currentWeekIndex = currentWeekResult === null ? 1 : parseInt(currentWeekResult[0].substr(2));
      currentYear = currentYearResult === null ? 2020 : parseInt(currentYearResult[0].substr(2));
      var dayIndex = parseInt(Array.prototype.indexOf.call(d.parentElement.children, d));
      return this.formatDate(this.getDateOfISOWeek(currentWeekIndex + 1, currentYear), dayIndex);
    }

    loadStats() {
      var contribColumns, countTotal, currentDayCount, currentStreakEnd, currentStreakStart, d, dateBest, dateFirst,
        dateLast, datesCurrent, datesLongest, datesTotal, dayDifference, days, i, j, len, longestStreakEnd,
        longestStreakStart, streakCurrent, streakLongest, tempStreak, tempStreakStart;
      streakLongest = 0;
      streakCurrent = 0;
      tempStreak = 0;
      tempStreakStart = null;
      longestStreakStart = null;
      longestStreakEnd = null;
      currentStreakStart = null;
      currentStreakEnd = null;
      datesCurrent = null;
      contribColumns = $('.contrib-column');
      days = document.querySelectorAll('.graph svg > svg > g');
      i = 0;
      days.forEach((d) => {
        currentDayClassString = d.children[0].className['baseVal'].toLocaleString();
        const isToday = currentDayClassString.match(/now/g);
        const today = isToday !== null ? isToday[0] : null;
        i++;
        let currentDayCount, tempStreakEnd;
        currentDayCount = this.getRectCount(d);
        yearTotal += currentDayCount;
        if (i === 1) {
          firstDay = this.getRectDate(d);
        }
        if (isToday) {
          lastDay = this.getRectDate(d);
          currentStreakEnd = lastDay;
        }
        // Check for best day
        if (currentDayCount > maxCount) {
          bestDay = this.getRectDate(d);
          maxCount = currentDayCount;
        }
        // Check for longest streak
        if (currentDayCount > 0) {
          if (tempStreak === 0) {
            tempStreakStart = this.getRectDate(d);
          }
          tempStreak++;
          if (tempStreak >= streakLongest) {
            longestStreakStart = tempStreakStart;
            longestStreakEnd = this.getRectDate(d);
            return streakLongest = tempStreak;
          }
        } else {
          tempStreak = 0;
          tempStreakStart = null;
          return tempStreakEnd = null;
        }
      });
      // Check for current streak
      // Have to iterate and access differently than above because
      // we end up with a regular JS Array after reversing
      var daysNodeList = document.querySelectorAll('.graph svg > svg > g');
      days = Array.prototype.slice.call(daysNodeList).reverse();
      var currentDayClassString, currentDayResult;
      for (i = j = 0, len = days.length; j < len; i = ++j) {
        d = days[i];
        currentDayCount = this.getRectCount(d);
        // If there's no activity today, continue on to yesterday
        if (i === 0 && currentDayCount === 0) {
          currentStreakEnd = this.getRectDate(days[1]);
          continue;
        }
        if (currentDayCount > 0) {
          streakCurrent++;
          currentStreakStart = this.getRectDate(d);
        } else {
          break;
        }
      }
      // fetch('/api/user_submission_calendar/nesrinesghaier').then(r => r.json()).then(j=>JSON.parse(j))
      if (streakCurrent > 0) {
        currentStreakStart = this.formatDateString(currentStreakStart, dateOptions);
        currentStreakEnd = this.formatDateString(currentStreakEnd, dateOptions);
        datesCurrent = currentStreakStart + " — " + currentStreakEnd;
      } else {
        datesCurrent = "No current streak";
      }
      // Year total
      countTotal = yearTotal.toLocaleString();
      dateFirst = this.formatDateString(firstDay, dateWithYearOptions);
      dateLast = this.formatDateString(lastDay, dateWithYearOptions);
      datesTotal = dateFirst + " — " + dateLast;
      // Average Contribution per Day
      dayDifference = this.datesDayDifference(firstDay, lastDay);
      averageCount = this.precisionRound(yearTotal / dayDifference, 2);
      // Best day
      dateBest = this.formatDateString(bestDay, dateOptions);
      if (!dateBest) {
        dateBest = 'No activity found';
      }

      // Longest streak
      if (streakLongest > 0) {
        longestStreakStart = this.formatDateString(longestStreakStart, dateOptions);
        longestStreakEnd = this.formatDateString(longestStreakEnd, dateOptions);
        datesLongest = longestStreakStart + " — " + longestStreakEnd;
      } else {
        datesLongest = "No longest streak";
      }
      this.renderTopStats(countTotal, averageCount, datesTotal, maxCount, dateBest);
      return this.renderBottomStats(streakLongest, datesLongest, streakCurrent, datesCurrent);
    }

    renderTopStats(countTotal, averageCount, datesTotal, maxCount, dateBest) {
      var html;
      html = `<div class="ic-stats-block ic-stats-top">\n  <span class="ic-stats-table">\n    <span class="ic-stats-row">\n      <span class="ic-stats-label">1 year total\n        <span class="ic-stats-count">${countTotal}</span>\n        <span class="ic-stats-average">${averageCount}</span> per day\n      </span>\n      <span class="ic-stats-meta ic-stats-total-meta">\n        <span class="ic-stats-unit">submissions</span>\n        <span class="ic-stats-date">${datesTotal}</span>\n      </span>\n    </span>\n    <span class="ic-stats-row">\n      <span class="ic-stats-label">Busiest day\n        <span class="ic-stats-count">${maxCount}</span>\n      </span>\n      <span class="ic-stats-meta">\n        <span class="ic-stats-unit">contributions</span>\n          <span class="ic-stats-date">${dateBest}</span>\n        </span>\n      </span>\n    </span>\n  </span>\n</div>`;
      return ($(html)).appendTo($('.ic-submissions-wrapper'));
    }

    renderBottomStats(streakLongest, datesLongest, streakCurrent, datesCurrent) {
      var html;
      html = `<div class="ic-stats-block ic-stats-bottom">\n  <span class="ic-stats-table">\n    <span class="ic-stats-row">\n      <span class="ic-stats-label">Longest streak\n        <span class="ic-stats-count">${streakLongest}</span>\n      </span>\n      <span class="ic-stats-meta">\n        <span class="ic-stats-unit">days</span>\n        <span class="ic-stats-date">${datesLongest}</span>\n      </span>\n    </span>\n    <span class="ic-stats-row">\n      <span class="ic-stats-label">Current streak\n        <span class="ic-stats-count">${streakCurrent}</span>\n      </span>\n      <span class="ic-stats-meta">\n        <span class="ic-stats-unit">days</span>\n        <span class="ic-stats-date">${datesCurrent}</span>\n      </span>\n    </span>\n  </span>\n</div>`;
      return ($(html)).appendTo($('.ic-submissions-wrapper'));
    }

    renderIsometricChart() {
      var GH_OFFSET, MAX_HEIGHT, SIZE, canvas, contribCount, pixelView, point, self;
      SIZE = 10;
      MAX_HEIGHT = 100;
      const firstWeek = $('.graph-domain').get(1).className['baseVal'].match(/w_[0-9]{1,}/);
      GH_OFFSET = firstWeek === null ? 1 : parseInt(firstWeek[0].substr(2));
      canvas = document.getElementById('isometric-submissions');
      // create pixel view container in point
      if (GH_OFFSET === 10) {
        point = new obelisk.Point(70, 70);
      } else {
        point = new obelisk.Point(110, 90);
      }
      pixelView = new obelisk.PixelView(canvas, point);
      contribCount = null;
      self = this;
      let weeks = document.querySelectorAll('.graph-domain > svg');
      return (weeks.forEach(function (w, index) {
        var x;
        x = index;
        $(w).find('rect').each(function (i, r) {
          var color, cube, cubeHeight, currentDayClassString, currentDayResult, dimension, fill, p3d, y;
          // r = ($(this)).get(0);
          y = i;
          currentDayClassString = r.className['baseVal'].toLocaleString();
          currentDayResult = currentDayClassString.match(/q\d/);
          fill = currentDayResult == null ? 0 : parseInt(currentDayResult[0][1]);
          contribCount = currentDayResult == null ? 0 : parseInt(currentDayResult[0][1]);
          cubeHeight = 3;
          if (maxCount > 0) {
            cubeHeight += parseInt(MAX_HEIGHT / maxCount * contribCount);
          }
          dimension = new obelisk.CubeDimension(SIZE, SIZE, cubeHeight);
          color = self.getSquareColor(fill);
          cube = new obelisk.Cube(dimension, color, false);
          p3d = new obelisk.Point3D(SIZE * x, SIZE * y, 0);
          return pixelView.renderObject(cube, p3d);
        });
      }));
    }

    getSquareColor(fill) {
      var color;
      return color = (function () {
        switch (fill) {
          case 0:
            return COLORS[0];
          case 1:
            return COLORS[1];
          case 2:
            return COLORS[2];
          case 3:
            return COLORS[3];
          case 4:
            return COLORS[4];
          case 5:
            return COLORS[5];
          default:
            return COLORS[0]
        }
      })();
    }

    formatDateString(dateStr, options) {
      var date, dateParts;
      date = null;
      if (dateStr) {
        dateParts = dateStr.split('-');
        date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0).toLocaleDateString('en-US', options);
      }
      return date;
    }

    datesDayDifference(dateStr1, dateStr2) {
      var date1, date2, dateParts, diffDays, timeDiff;
      diffDays = null;
      date1 = null;
      date2 = null;
      if (dateStr1) {
        dateParts = dateStr1.split('-');
        date1 = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0);
      }
      if (dateStr2) {
        dateParts = dateStr2.split('-');
        date2 = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0);
      }
      if (dateStr1 && dateStr2) {
        timeDiff = Math.abs(date2.getTime() - date1.getTime());
        diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
      }
      return diffDays;
    }

    precisionRound(number, precision) {
      var factor;
      factor = Math.pow(10, precision);
      return Math.round(number * factor) / factor;
    }

  }

  COLORS = [new obelisk.CubeColor().getByHorizontalColor(0xededed),
    new obelisk.CubeColor().getByHorizontalColor(0xdae289),
    new obelisk.CubeColor().getByHorizontalColor(0x9cc069),
    new obelisk.CubeColor().getByHorizontalColor(0x669d45),
    new obelisk.CubeColor().getByHorizontalColor(0x637939),
    new obelisk.CubeColor().getByHorizontalColor(0x3b6427)];

  yearTotal = 0;

  averageCount = 0;

  maxCount = 0;

  bestDay = null;

  firstDay = null;

  lastDay = null;

  contributionsBox = null;

  dateOptions = {
    month: "short",
    day: "numeric"
  };

  dateWithYearOptions = {
    month: "short",
    day: "numeric",
    year: "numeric"
  };
  return Iso;

}).call(this);

if (document.querySelector('#cal-heatmap')) {
  loadIso = function () {
    if (!($('#cal-heatmap')).hasClass('ic-cubes')) {
      return $(function () {
        var iso, target;
        target = document.querySelector('#cal-heatmap');
        return iso = new Iso(target);
      });
    }
  };
  // load iso graph when the page first load
  loadIso();
}
