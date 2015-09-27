(function() {
  var callWithJQuery,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    slice = [].slice,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    hasProp = {}.hasOwnProperty;

  callWithJQuery = function(pivotModule) {
    if (typeof exports === "object" && typeof module === "object") {
      return pivotModule(require("jquery"));
    } else if (typeof define === "function" && define.amd) {
      return define(["jquery"], pivotModule);
    } else {
      return pivotModule(jQuery);
    }
  };

  callWithJQuery(function($) {

    /*
    Utilities
     */
    var PivotData, addSeparators, aggregatorTemplates, aggregators, dayNamesEn, derivers, locales, mfTableRenderer, mthNamesEn, naturalSort, numberFormat, pivotTableRenderer, renderers, usFmt, usFmtInt, usFmtPct, zeroPad;
    addSeparators = function(nStr, thousandsSep, decimalSep) {
      var rgx, x, x1, x2;
      nStr += '';
      x = nStr.split('.');
      x1 = x[0];
      x2 = x.length > 1 ? decimalSep + x[1] : '';
      rgx = /(\d+)(\d{3})/;
      while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + thousandsSep + '$2');
      }
      return x1 + x2;
    };
    numberFormat = function(opts) {
      var defaults;
      defaults = {
        digitsAfterDecimal: 2,
        scaler: 1,
        thousandsSep: ",",
        decimalSep: ".",
        prefix: "",
        suffix: "",
        showZero: false
      };
      opts = $.extend(defaults, opts);
      return function(x) {
        var result;
        if (isNaN(x) || !isFinite(x)) {
          return "";
        }
        if (x === 0 && !opts.showZero) {
          return "";
        }
        result = addSeparators((opts.scaler * x).toFixed(opts.digitsAfterDecimal), opts.thousandsSep, opts.decimalSep);
        return "" + opts.prefix + result + opts.suffix;
      };
    };
    usFmt = numberFormat();
    usFmtInt = numberFormat({
      digitsAfterDecimal: 0
    });
    usFmtPct = numberFormat({
      digitsAfterDecimal: 1,
      scaler: 100,
      suffix: "%"
    });
    aggregatorTemplates = {
      count: function(formatter) {
        if (formatter == null) {
          formatter = usFmtInt;
        }
        return function() {
          return function(data, rowKey, colKey) {
            return {
              count: 0,
              push: function() {
                return this.count++;
              },
              value: function() {
                return this.count;
              },
              format: formatter
            };
          };
        };
      },
      countUnique: function(formatter) {
        if (formatter == null) {
          formatter = usFmtInt;
        }
        return function(arg) {
          var attr;
          attr = arg[0];
          return function(data, rowKey, colKey) {
            return {
              uniq: [],
              push: function(record) {
                var ref;
                if (ref = record[attr], indexOf.call(this.uniq, ref) < 0) {
                  return this.uniq.push(record[attr]);
                }
              },
              value: function() {
                return this.uniq.length;
              },
              format: formatter,
              numInputs: attr != null ? 0 : 1
            };
          };
        };
      },
      listUnique: function(sep) {
        return function(arg) {
          var attr;
          attr = arg[0];
          return function(data, rowKey, colKey) {
            return {
              uniq: [],
              push: function(record) {
                var ref;
                if (ref = record[attr], indexOf.call(this.uniq, ref) < 0) {
                  return this.uniq.push(record[attr]);
                }
              },
              value: function() {
                return this.uniq.join(sep);
              },
              format: function(x) {
                return x;
              },
              numInputs: attr != null ? 0 : 1
            };
          };
        };
      },
      sum: function(formatter) {
        if (formatter == null) {
          formatter = usFmt;
        }
        return function(arg) {
          var attr;
          attr = arg[0];
          return function(data, rowKey, colKey) {
            return {
              sum: 0,
              push: function(record) {
                if (!isNaN(parseFloat(record[attr]))) {
                  return this.sum += parseFloat(record[attr]);
                }
              },
              value: function() {
                return this.sum;
              },
              format: formatter,
              numInputs: attr != null ? 0 : 1
            };
          };
        };
      },
      mfSum: function(formatter) {
        if (formatter == null) {
          formatter = usFmtInt;
        }
        return function(_arg) {
          return function(data, rowKey, colKey) {
            var _i, _summedFacts;
            _summedFacts = {};
            _i = 0;
            while (_i < _arg.length) {
              _summedFacts[_arg[_i]] = 0;
              _i++;
            }
            return {
              push: function(record) {
                _i = 0;
                while (_i < _arg.length) {
                  if (!isNaN(parseFloat(record[_arg[_i]]))) {
                    _summedFacts[_arg[_i]] += parseFloat(record[_arg[_i]]);
                  }
                  _i++;
                }
              },
              multivalue: function() {
                return _summedFacts;
              },
              value: function() {
                var attr;
                attr = _arg[0];
                return _summedFacts[_arg[0]];
              },
              format: formatter
            };
          };
        };
      },
      average: function(formatter) {
        if (formatter == null) {
          formatter = usFmt;
        }
        return function(arg) {
          var attr;
          attr = arg[0];
          return function(data, rowKey, colKey) {
            return {
              sum: 0,
              len: 0,
              push: function(record) {
                if (!isNaN(parseFloat(record[attr]))) {
                  this.sum += parseFloat(record[attr]);
                  return this.len++;
                }
              },
              value: function() {
                return this.sum / this.len;
              },
              format: formatter,
              numInputs: attr != null ? 0 : 1
            };
          };
        };
      },
      sumOverSum: function(formatter) {
        if (formatter == null) {
          formatter = usFmt;
        }
        return function(arg) {
          var denom, num;
          num = arg[0], denom = arg[1];
          return function(data, rowKey, colKey) {
            return {
              sumNum: 0,
              sumDenom: 0,
              push: function(record) {
                if (!isNaN(parseFloat(record[num]))) {
                  this.sumNum += parseFloat(record[num]);
                }
                if (!isNaN(parseFloat(record[denom]))) {
                  return this.sumDenom += parseFloat(record[denom]);
                }
              },
              value: function() {
                return this.sumNum / this.sumDenom;
              },
              format: formatter,
              numInputs: (num != null) && (denom != null) ? 0 : 2
            };
          };
        };
      },
      sumOverSumBound80: function(upper, formatter) {
        if (upper == null) {
          upper = true;
        }
        if (formatter == null) {
          formatter = usFmt;
        }
        return function(arg) {
          var denom, num;
          num = arg[0], denom = arg[1];
          return function(data, rowKey, colKey) {
            return {
              sumNum: 0,
              sumDenom: 0,
              push: function(record) {
                if (!isNaN(parseFloat(record[num]))) {
                  this.sumNum += parseFloat(record[num]);
                }
                if (!isNaN(parseFloat(record[denom]))) {
                  return this.sumDenom += parseFloat(record[denom]);
                }
              },
              value: function() {
                var sign;
                sign = upper ? 1 : -1;
                return (0.821187207574908 / this.sumDenom + this.sumNum / this.sumDenom + 1.2815515655446004 * sign * Math.sqrt(0.410593603787454 / (this.sumDenom * this.sumDenom) + (this.sumNum * (1 - this.sumNum / this.sumDenom)) / (this.sumDenom * this.sumDenom))) / (1 + 1.642374415149816 / this.sumDenom);
              },
              format: formatter,
              numInputs: (num != null) && (denom != null) ? 0 : 2
            };
          };
        };
      },
      fractionOf: function(wrapped, type, formatter) {
        if (type == null) {
          type = "total";
        }
        if (formatter == null) {
          formatter = usFmtPct;
        }
        return function() {
          var x;
          x = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return function(data, rowKey, colKey) {
            return {
              selector: {
                total: [[], []],
                row: [rowKey, []],
                col: [[], colKey]
              }[type],
              inner: wrapped.apply(null, x)(data, rowKey, colKey),
              push: function(record) {
                return this.inner.push(record);
              },
              format: formatter,
              value: function() {
                return this.inner.value() / data.getAggregator.apply(data, this.selector).inner.value();
              },
              numInputs: wrapped.apply(null, x)().numInputs
            };
          };
        };
      }
    };
    aggregators = (function(tpl) {
      return {
        "Count": tpl.count(usFmtInt),
        "Count Unique Values": tpl.countUnique(usFmtInt),
        "List Unique Values": tpl.listUnique(", "),
        "Sum": tpl.sum(usFmt),
        "MFSum": tpl.mfSum(usFmt),
        "Integer Sum": tpl.sum(usFmtInt),
        "Average": tpl.average(usFmt),
        "Sum over Sum": tpl.sumOverSum(usFmt),
        "80% Upper Bound": tpl.sumOverSumBound80(true, usFmt),
        "80% Lower Bound": tpl.sumOverSumBound80(false, usFmt),
        "Sum as Fraction of Total": tpl.fractionOf(tpl.sum(), "total", usFmtPct),
        "Sum as Fraction of Rows": tpl.fractionOf(tpl.sum(), "row", usFmtPct),
        "Sum as Fraction of Columns": tpl.fractionOf(tpl.sum(), "col", usFmtPct),
        "Count as Fraction of Total": tpl.fractionOf(tpl.count(), "total", usFmtPct),
        "Count as Fraction of Rows": tpl.fractionOf(tpl.count(), "row", usFmtPct),
        "Count as Fraction of Columns": tpl.fractionOf(tpl.count(), "col", usFmtPct)
      };
    })(aggregatorTemplates);
    renderers = {
      "Table": function(pvtData, opts) {
        return pivotTableRenderer(pvtData, opts);
      },
      "MFTable": function(pvtData, opts) {
        return mfTableRenderer(pvtData, opts);
      },
      "Table Barchart": function(pvtData, opts) {
        return $(pivotTableRenderer(pvtData, opts)).barchart();
      },
      "Heatmap": function(pvtData, opts) {
        return $(pivotTableRenderer(pvtData, opts)).heatmap();
      },
      "Row Heatmap": function(pvtData, opts) {
        return $(pivotTableRenderer(pvtData, opts)).heatmap("rowheatmap");
      },
      "Col Heatmap": function(pvtData, opts) {
        return $(pivotTableRenderer(pvtData, opts)).heatmap("colheatmap");
      }
    };
    locales = {
      en: {
        aggregators: aggregators,
        renderers: renderers,
        localeStrings: {
          renderError: "An error occurred rendering the PivotTable results.",
          computeError: "An error occurred computing the PivotTable results.",
          uiRenderError: "An error occurred rendering the PivotTable UI.",
          selectAll: "Select All",
          selectNone: "Select None",
          tooMany: "(too many to list)",
          filterResults: "Filter results",
          totals: "Totals",
          vs: "vs",
          by: "by"
        }
      }
    };
    mthNamesEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    dayNamesEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    zeroPad = function(number) {
      return ("0" + number).substr(-2, 2);
    };
    derivers = {
      bin: function(col, binWidth) {
        return function(record) {
          return record[col] - record[col] % binWidth;
        };
      },
      dateFormat: function(col, formatString, mthNames, dayNames) {
        if (mthNames == null) {
          mthNames = mthNamesEn;
        }
        if (dayNames == null) {
          dayNames = dayNamesEn;
        }
        return function(record) {
          var date;
          date = new Date(Date.parse(record[col]));
          if (isNaN(date)) {
            return "";
          }
          return formatString.replace(/%(.)/g, function(m, p) {
            switch (p) {
              case "y":
                return date.getFullYear();
              case "m":
                return zeroPad(date.getMonth() + 1);
              case "n":
                return mthNames[date.getMonth()];
              case "d":
                return zeroPad(date.getDate());
              case "w":
                return dayNames[date.getDay()];
              case "x":
                return date.getDay();
              case "H":
                return zeroPad(date.getHours());
              case "M":
                return zeroPad(date.getMinutes());
              case "S":
                return zeroPad(date.getSeconds());
              default:
                return "%" + p;
            }
          });
        };
      }
    };
    naturalSort = (function(_this) {
      return function(as, bs) {
        var a, a1, b, b1, rd, rx, rz;
        rx = /(\d+)|(\D+)/g;
        rd = /\d/;
        rz = /^0/;
        if (typeof as === "number" || typeof bs === "number") {
          if (isNaN(as)) {
            return 1;
          }
          if (isNaN(bs)) {
            return -1;
          }
          return as - bs;
        }
        a = String(as).toLowerCase();
        b = String(bs).toLowerCase();
        if (a === b) {
          return 0;
        }
        if (!(rd.test(a) && rd.test(b))) {
          return (a > b ? 1 : -1);
        }
        a = a.match(rx);
        b = b.match(rx);
        while (a.length && b.length) {
          a1 = a.shift();
          b1 = b.shift();
          if (a1 !== b1) {
            if (rd.test(a1) && rd.test(b1)) {
              return a1.replace(rz, ".0") - b1.replace(rz, ".0");
            } else {
              return (a1 > b1 ? 1 : -1);
            }
          }
        }
        return a.length - b.length;
      };
    })(this);
    $.pivotUtilities = {
      aggregatorTemplates: aggregatorTemplates,
      aggregators: aggregators,
      renderers: renderers,
      derivers: derivers,
      locales: locales,
      naturalSort: naturalSort,
      numberFormat: numberFormat
    };

    /*
    Data Model class
     */
    PivotData = (function() {
      function PivotData(input, opts) {
        this.getAggregator = bind(this.getAggregator, this);
        this.getRowKeys = bind(this.getRowKeys, this);
        this.getColKeys = bind(this.getColKeys, this);
        this.sortKeys = bind(this.sortKeys, this);
        this.arrSort = bind(this.arrSort, this);
        this.natSort = bind(this.natSort, this);
        this.aggregator = opts.aggregator;
        this.aggregatorName = opts.aggregatorName;
        this.colAttrs = opts.cols;
        this.rowAttrs = opts.rows;
        this.valAttrs = opts.vals;
        this.tree = {};
        this.rowKeys = [];
        this.colKeys = [];
        this.rowTotals = {};
        this.colTotals = {};
        this.allTotal = this.aggregator(this, [], []);
        this.sorted = false;
        PivotData.forEachRecord(input, opts.derivedAttributes, (function(_this) {
          return function(record) {
            if (opts.filter(record)) {
              return _this.processRecord(record);
            }
          };
        })(this));
      }

      PivotData.forEachRecord = function(input, derivedAttributes, f) {
        var addRecord, compactRecord, i, j, k, l, len1, record, ref, results, results1, tblCols;
        if ($.isEmptyObject(derivedAttributes)) {
          addRecord = f;
        } else {
          addRecord = function(record) {
            var k, ref, v;
            for (k in derivedAttributes) {
              v = derivedAttributes[k];
              record[k] = (ref = v(record)) != null ? ref : record[k];
            }
            return f(record);
          };
        }
        if ($.isFunction(input)) {
          return input(addRecord);
        } else if ($.isArray(input)) {
          if ($.isArray(input[0])) {
            results = [];
            for (i in input) {
              if (!hasProp.call(input, i)) continue;
              compactRecord = input[i];
              if (!(i > 0)) {
                continue;
              }
              record = {};
              ref = input[0];
              for (j in ref) {
                if (!hasProp.call(ref, j)) continue;
                k = ref[j];
                record[k] = compactRecord[j];
              }
              results.push(addRecord(record));
            }
            return results;
          } else {
            results1 = [];
            for (l = 0, len1 = input.length; l < len1; l++) {
              record = input[l];
              results1.push(addRecord(record));
            }
            return results1;
          }
        } else if (input instanceof jQuery) {
          tblCols = [];
          $("thead > tr > th", input).each(function(i) {
            return tblCols.push($(this).text());
          });
          return $("tbody > tr", input).each(function(i) {
            record = {};
            $("td", this).each(function(j) {
              return record[tblCols[j]] = $(this).html();
            });
            return addRecord(record);
          });
        } else {
          throw new Error("unknown input format");
        }
      };

      PivotData.convertToArray = function(input) {
        var result;
        result = [];
        PivotData.forEachRecord(input, {}, function(record) {
          return result.push(record);
        });
        return result;
      };

      PivotData.prototype.natSort = function(as, bs) {
        return naturalSort(as, bs);
      };

      PivotData.prototype.arrSort = function(a, b) {
        return this.natSort(a.join(), b.join());
      };

      PivotData.prototype.sortKeys = function() {
        if (!this.sorted) {
          this.rowKeys.sort(this.arrSort);
          this.colKeys.sort(this.arrSort);
        }
        return this.sorted = true;
      };

      PivotData.prototype.getColKeys = function() {
        this.sortKeys();
        return this.colKeys;
      };

      PivotData.prototype.getRowKeys = function() {
        this.sortKeys();
        return this.rowKeys;
      };

      PivotData.prototype.processRecord = function(record) {
        var colKey, flatColKey, flatRowKey, l, len1, len2, n, ref, ref1, ref2, ref3, rowKey, x;
        colKey = [];
        rowKey = [];
        ref = this.colAttrs;
        for (l = 0, len1 = ref.length; l < len1; l++) {
          x = ref[l];
          colKey.push((ref1 = record[x]) != null ? ref1 : "null");
        }
        ref2 = this.rowAttrs;
        for (n = 0, len2 = ref2.length; n < len2; n++) {
          x = ref2[n];
          rowKey.push((ref3 = record[x]) != null ? ref3 : "null");
        }
        flatRowKey = rowKey.join(String.fromCharCode(0));
        flatColKey = colKey.join(String.fromCharCode(0));
        this.allTotal.push(record);
        if (rowKey.length !== 0) {
          if (!this.rowTotals[flatRowKey]) {
            this.rowKeys.push(rowKey);
            this.rowTotals[flatRowKey] = this.aggregator(this, rowKey, []);
          }
          this.rowTotals[flatRowKey].push(record);
        }
        if (colKey.length !== 0) {
          if (!this.colTotals[flatColKey]) {
            this.colKeys.push(colKey);
            this.colTotals[flatColKey] = this.aggregator(this, [], colKey);
          }
          this.colTotals[flatColKey].push(record);
        }
        if (colKey.length !== 0 && rowKey.length !== 0) {
          if (!this.tree[flatRowKey]) {
            this.tree[flatRowKey] = {};
          }
          if (!this.tree[flatRowKey][flatColKey]) {
            this.tree[flatRowKey][flatColKey] = this.aggregator(this, rowKey, colKey);
          }
          return this.tree[flatRowKey][flatColKey].push(record);
        }
      };

      PivotData.prototype.getAggregator = function(rowKey, colKey) {
        var agg, flatColKey, flatRowKey;
        flatRowKey = rowKey.join(String.fromCharCode(0));
        flatColKey = colKey.join(String.fromCharCode(0));
        if (rowKey.length === 0 && colKey.length === 0) {
          agg = this.allTotal;
        } else if (rowKey.length === 0) {
          agg = this.colTotals[flatColKey];
        } else if (colKey.length === 0) {
          agg = this.rowTotals[flatRowKey];
        } else {
          agg = this.tree[flatRowKey][flatColKey];
        }
        return agg != null ? agg : {
          value: (function() {
            return null;
          }),
          format: function() {
            return "";
          }
        };
      };

      return PivotData;

    })();

    /*
    Default Renderer for hierarchical table layout
     */
    mfTableRenderer = function(pivotData, opts) {
      var _d, aggregator, c, cl, colAttrs, colKey, colKeys, col_colspan, col_rowspan, cols_length, colspan, html, i, j, r, result, rowAttrs, rowKey, rowKeys, rowspan, spanSize, th, tmpAggregator, totalAggregator, tr, txt, v, val, valAttrs, x;
      aggregator = void 0;
      c = void 0;
      colAttrs = void 0;
      colKey = void 0;
      colKeys = void 0;
      i = void 0;
      j = void 0;
      r = void 0;
      result = void 0;
      rowAttrs = void 0;
      rowKey = void 0;
      rowKeys = void 0;
      th = void 0;
      totalAggregator = void 0;
      tr = void 0;
      txt = void 0;
      val = void 0;
      x = void 0;
      valAttrs = pivotData.valAttrs;
      colAttrs = pivotData.colAttrs;
      rowAttrs = pivotData.rowAttrs;
      rowKeys = pivotData.getRowKeys();
      colKeys = pivotData.getColKeys();
      spanSize = function(arr, i, j) {
        var _i, _j, len, noDraw, stop;
        len = void 0;
        noDraw = void 0;
        stop = void 0;
        x = void 0;
        _i = void 0;
        _j = void 0;
        if (i !== 0) {
          noDraw = true;
          x = 0;
          if (0 <= j) {
            _i = 0;
            while (_i <= j) {
              x = _i;
              if (arr[i - 1][x] !== arr[i][x]) {
                noDraw = false;
              }
              ++_i;
            }
          } else {
            _i = 0;
            while (_i >= j) {
              x = _i;
              if (arr[i - 1][x] !== arr[i][x]) {
                noDraw = false;
              }
              --_i;
            }
          }
          if (noDraw) {
            return -1;
          }
        }
        len = 0;
        while (i + len < arr.length) {
          stop = false;
          x = 0;
          if (0 <= j) {
            _j = 0;
            while (_j <= j) {
              x = _j;
              if (arr[i][x] !== arr[i + len][x]) {
                stop = true;
              }
              ++_j;
            }
          } else {
            _j = 0;
            while (_j >= j) {
              x = _j;
              if (arr[i][x] !== arr[i + len][x]) {
                stop = true;
              }
              --_j;
            }
          }
          if (stop) {
            break;
          }
          len++;
        }
        return len;
      };
      result = $("<table class='table table-bordered pvtTable'>");
      for (j in colAttrs) {
        c = colAttrs[j];
        tr = $("<tr>");
        if (parseInt(j) === 0 && rowAttrs.length !== 0) {
          tr.append($("<th>").attr("colspan", rowAttrs.length).attr("rowspan", colAttrs.length));
        }
        tr.append($("<th class='pvtAxisLabel'>").text(c));
        tmpAggregator = pivotData.getAggregator([], []);
        if (tmpAggregator.multivalue) {
          col_colspan = Object.keys(tmpAggregator.multivalue()).length;
          col_rowspan = 1;
        } else {
          col_colspan = 1;
          col_rowspan = 2;
        }
        for (i in colKeys) {
          colKey = colKeys[i];
          th = $("<th class='pvtColLabel'>").text(colKey[j]).attr("colspan", col_colspan);
          if (parseInt(j) === colAttrs.length - 1 && rowAttrs.length !== 0) {
            th.attr("rowspan", col_rowspan);
          }
          tr.append(th);
        }
        if (parseInt(j) === 0) {
          tr.append($("<th class='pvtTotalLabel'>").text("TOTALS").attr("colspan", col_colspan).attr("rowspan", colAttrs.length));
        }
        result.append(tr);
      }
      if (rowAttrs.length !== 0) {
        tr = $("<tr>");
        for (i in rowAttrs) {
          r = rowAttrs[i];
          tr.append($("<th class='pvtAxisLabel'>").text(r));
        }
        tmpAggregator = pivotData.getAggregator([], []);
        if (tmpAggregator.multivalue) {
          if (colAttrs.length > 0) {
            th = $("<th>");
            tr.append(th);
          }
          val = tmpAggregator.multivalue();
          for (i in colKeys) {
            for (v in val) {
              tr.append($("<th class='pvtColLabel'>").text(v).data("value", v));
            }
          }
          for (v in val) {
            tr.append($("<th class='pvtColLabel'>").text(v).data("value", v));
          }
        } else {
          th = $("<th>");
          if (colAttrs.length === 0) {
            th.addClass("pvtTotalLabel").text("TOTALS");
          }
          tr.append(th);
        }
        result.append(tr);
      }
      for (i in rowKeys) {
        rowKey = rowKeys[i];
        tr = $("<tr>");
        for (j in rowKey) {
          txt = rowKey[j];

          /*th = $("<th class='pvtRowLabel'>").text(txt).attr("rowspan", x)
          th.attr "colspan", 2  if parseInt(j) is rowAttrs.length - 1 and colAttrs.length isnt 0
          tr.append th
           */
          colspan = 1;
          if (j === 1) {
            colspan = rowAttrs.length;
          } else {
            if (colAttrs.length > 0) {
              colspan = 1;
            }
          }
          rowspan = spanSize(rowKeys, parseInt(i), parseInt(j));
          if (rowspan !== -1) {
            th = $('<th class=\'pvtRowLabel\'>').text(txt).attr('rowspan', rowspan).attr('colspan', colspan);
            tr.append(th);
          }
        }
        for (j in colKeys) {
          colKey = colKeys[j];
          aggregator = pivotData.getAggregator(rowKey, colKey);
          if (aggregator.multivalue) {
            val = aggregator.multivalue();
            for (v in val) {
              tr.append($("<td class='pvtVal row" + i + " col" + j + "-" + v + "'>").text(aggregator.format(val[v])).data("value", val[v]));
            }
          } else {
            val = aggregator.value();
            if (val) {
              tr.append($("<td class='pvtVal row" + i + " col" + j + "'>").text(aggregator.format(val)).data('value', val));
            } else {
              tmpAggregator = pivotData.getAggregator([], []);
              cols_length = 1;
              if (tmpAggregator.multivalue) {
                cols_length = Object.keys(tmpAggregator.multivalue()).length;
              }
              cl = 0;
              while (cl < cols_length) {
                tr.append($("<td class='pvtVal row" + i + " col" + j + "-" + cl + "'>").text('').data('value', null));
                cl++;
              }
            }
          }
        }
        totalAggregator = pivotData.getAggregator(rowKey, []);
        if (totalAggregator.multivalue) {
          val = totalAggregator.multivalue();
          for (v in val) {
            tr.append("<td class='pvtTotal rowTotal'>" + totalAggregator.format(val[v]) + "</td>");
          }
        } else {
          val = totalAggregator.value();
          tr.append($("<td class='pvtTotal rowTotal'>").text(totalAggregator.format(val)).data("value", val).data("for", "row" + i));
        }
        result.append(tr);
      }
      tr = $("<tr>");
      th = $("<th class='pvtTotalLabel'>").text("TOTALS");
      th.attr("colspan", rowAttrs.length + (colAttrs.length === 0 ? 0 : 1));
      tr.append(th);
      for (j in colKeys) {
        console.log("local_debug[3]");
        colKey = colKeys[j];
        totalAggregator = pivotData.getAggregator([], colKey);
        if (totalAggregator.multivalue) {
          val = totalAggregator.multivalue();
          for (v in val) {
            tr.append($("<td class='pvtTotal colTotal'>").text(totalAggregator.format(val[v])).data("value", val[v]).data("for", "col" + j));
          }
        } else {
          val = totalAggregator.value();
          tr.append($("<td class='pvtTotal colTotal'>").text(totalAggregator.format(val)).data("value", val).data("for", "col" + j));
        }
      }
      totalAggregator = pivotData.getAggregator([], []);
      if (totalAggregator.multivalue) {
        val = totalAggregator.multivalue();
        for (v in val) {
          _d = val[v];
          html = "<td class='pvtGrandTotal'>" + _d + "</td>";
          tr.append(html);
        }
      } else {
        val = totalAggregator.value();
        html = $("<td class='pvtGrandTotal'>").text(totalAggregator.format(val)).data("value", val);
        tr.append(html);
      }
      result.append(tr);
      result.data("dimensions", [rowKeys.length, colKeys.length]);
      return result;
    };
    pivotTableRenderer = function(pivotData, opts) {
      var aggregator, c, colAttrs, colKey, colKeys, defaults, i, j, r, result, rowAttrs, rowKey, rowKeys, spanSize, td, th, totalAggregator, tr, txt, val, x;
      defaults = {
        localeStrings: {
          totals: "Totals"
        }
      };
      opts = $.extend(defaults, opts);
      colAttrs = pivotData.colAttrs;
      rowAttrs = pivotData.rowAttrs;
      rowKeys = pivotData.getRowKeys();
      colKeys = pivotData.getColKeys();
      result = document.createElement("table");
      result.className = "pvtTable";
      spanSize = function(arr, i, j) {
        var l, len, n, noDraw, ref, ref1, stop, x;
        if (i !== 0) {
          noDraw = true;
          for (x = l = 0, ref = j; 0 <= ref ? l <= ref : l >= ref; x = 0 <= ref ? ++l : --l) {
            if (arr[i - 1][x] !== arr[i][x]) {
              noDraw = false;
            }
          }
          if (noDraw) {
            return -1;
          }
        }
        len = 0;
        while (i + len < arr.length) {
          stop = false;
          for (x = n = 0, ref1 = j; 0 <= ref1 ? n <= ref1 : n >= ref1; x = 0 <= ref1 ? ++n : --n) {
            if (arr[i][x] !== arr[i + len][x]) {
              stop = true;
            }
          }
          if (stop) {
            break;
          }
          len++;
        }
        return len;
      };
      for (j in colAttrs) {
        if (!hasProp.call(colAttrs, j)) continue;
        c = colAttrs[j];
        tr = document.createElement("tr");
        if (parseInt(j) === 0 && rowAttrs.length !== 0) {
          th = document.createElement("th");
          th.setAttribute("colspan", rowAttrs.length);
          th.setAttribute("rowspan", colAttrs.length);
          tr.appendChild(th);
        }
        th = document.createElement("th");
        th.className = "pvtAxisLabel";
        th.innerHTML = c;
        tr.appendChild(th);
        for (i in colKeys) {
          if (!hasProp.call(colKeys, i)) continue;
          colKey = colKeys[i];
          x = spanSize(colKeys, parseInt(i), parseInt(j));
          if (x !== -1) {
            th = document.createElement("th");
            th.className = "pvtColLabel";
            th.innerHTML = colKey[j];
            th.setAttribute("colspan", x);
            if (parseInt(j) === colAttrs.length - 1 && rowAttrs.length !== 0) {
              th.setAttribute("rowspan", 2);
            }
            tr.appendChild(th);
          }
        }
        if (parseInt(j) === 0) {
          th = document.createElement("th");
          th.className = "pvtTotalLabel";
          th.innerHTML = opts.localeStrings.totals;
          th.setAttribute("rowspan", colAttrs.length + (rowAttrs.length === 0 ? 0 : 1));
          tr.appendChild(th);
        }
        result.appendChild(tr);
      }
      if (rowAttrs.length !== 0) {
        tr = document.createElement("tr");
        for (i in rowAttrs) {
          if (!hasProp.call(rowAttrs, i)) continue;
          r = rowAttrs[i];
          th = document.createElement("th");
          th.className = "pvtAxisLabel";
          th.innerHTML = r;
          tr.appendChild(th);
        }
        th = document.createElement("th");
        if (colAttrs.length === 0) {
          th.className = "pvtTotalLabel";
          th.innerHTML = opts.localeStrings.totals;
        }
        tr.appendChild(th);
        result.appendChild(tr);
      }
      for (i in rowKeys) {
        if (!hasProp.call(rowKeys, i)) continue;
        rowKey = rowKeys[i];
        tr = document.createElement("tr");
        for (j in rowKey) {
          if (!hasProp.call(rowKey, j)) continue;
          txt = rowKey[j];
          x = spanSize(rowKeys, parseInt(i), parseInt(j));
          if (x !== -1) {
            th = document.createElement("th");
            th.className = "pvtRowLabel";
            th.innerHTML = txt;
            th.setAttribute("rowspan", x);
            if (parseInt(j) === rowAttrs.length - 1 && colAttrs.length !== 0) {
              th.setAttribute("colspan", 2);
            }
            tr.appendChild(th);
          }
        }
        for (j in colKeys) {
          if (!hasProp.call(colKeys, j)) continue;
          colKey = colKeys[j];
          aggregator = pivotData.getAggregator(rowKey, colKey);
          val = aggregator.value();
          td = document.createElement("td");
          td.className = "pvtVal row" + i + " col" + j;
          td.innerHTML = aggregator.format(val);
          td.setAttribute("data-value", val);
          tr.appendChild(td);
        }
        totalAggregator = pivotData.getAggregator(rowKey, []);
        val = totalAggregator.value();
        td = document.createElement("td");
        td.className = "pvtTotal rowTotal";
        td.innerHTML = totalAggregator.format(val);
        td.setAttribute("data-value", val);
        td.setAttribute("data-for", "row" + i);
        tr.appendChild(td);
        result.appendChild(tr);
      }
      tr = document.createElement("tr");
      th = document.createElement("th");
      th.className = "pvtTotalLabel";
      th.innerHTML = opts.localeStrings.totals;
      th.setAttribute("colspan", rowAttrs.length + (colAttrs.length === 0 ? 0 : 1));
      tr.appendChild(th);
      for (j in colKeys) {
        if (!hasProp.call(colKeys, j)) continue;
        colKey = colKeys[j];
        totalAggregator = pivotData.getAggregator([], colKey);
        val = totalAggregator.value();
        td = document.createElement("td");
        td.className = "pvtTotal colTotal";
        td.innerHTML = totalAggregator.format(val);
        td.setAttribute("data-value", val);
        td.setAttribute("data-for", "col" + j);
        tr.appendChild(td);
      }
      totalAggregator = pivotData.getAggregator([], []);
      val = totalAggregator.value();
      td = document.createElement("td");
      td.className = "pvtGrandTotal";
      td.innerHTML = totalAggregator.format(val);
      td.setAttribute("data-value", val);
      tr.appendChild(td);
      result.appendChild(tr);
      result.setAttribute("data-numrows", rowKeys.length);
      result.setAttribute("data-numcols", colKeys.length);
      return result;
    };

    /*
    Pivot Table core: create PivotData object and call Renderer on it
     */
    $.fn.pivot = function(input, opts) {
      var defaults, e, error, error1, pivotData, result, x;
      defaults = {
        cols: [],
        rows: [],
        filter: function() {
          return true;
        },
        aggregator: aggregatorTemplates.count()(),
        aggregatorName: "Count",
        derivedAttributes: {},
        renderer: pivotTableRenderer,
        rendererOptions: null,
        localeStrings: locales.en.localeStrings
      };
      opts = $.extend(defaults, opts);
      result = null;
      try {
        pivotData = new PivotData(input, opts);
        try {
          result = opts.renderer(pivotData, opts.rendererOptions);
        } catch (error) {
          e = error;
          if (typeof console !== "undefined" && console !== null) {
            console.error(e.stack);
          }
          result = $("<span>").html(opts.localeStrings.renderError);
        }
      } catch (error1) {
        e = error1;
        if (typeof console !== "undefined" && console !== null) {
          console.error(e.stack);
        }
        result = $("<span>").html(opts.localeStrings.computeError);
      }
      x = this[0];
      while (x.hasChildNodes()) {
        x.removeChild(x.lastChild);
      }
      return this.append(result);
    };

    /*
    Pivot Table UI: calls Pivot Table core above with options set by user
     */
    $.fn.pivotUI = function(input, inputOpts, overwrite, locale) {
      var a, aggregator, attrLength, axisValues, c, colList, defaults, e, error, existingOpts, fn, i, initialRender, k, l, len1, len2, len3, len4, n, o, opts, pivotTable, q, ref, ref1, ref2, ref3, ref4, refresh, refreshDelayed, renderer, rendererControl, shownAttributes, tblCols, tr1, tr2, uiTable, unusedAttrsVerticalAutoOverride, valOrg, valSel, x;
      if (overwrite == null) {
        overwrite = false;
      }
      if (locale == null) {
        locale = "en";
      }
      valSel = void 0;
      valOrg = void 0;
      defaults = {
        derivedAttributes: {},
        aggregators: locales[locale].aggregators,
        renderers: locales[locale].renderers,
        hiddenAttributes: [],
        menuLimit: 2000,
        cols: [],
        rows: [],
        vals: [],
        exclusions: {},
        unusedAttrsVertical: "auto",
        autoSortUnusedAttrs: false,
        rendererOptions: {
          localeStrings: locales[locale].localeStrings
        },
        onRefresh: null,
        filter: function() {
          return true;
        },
        localeStrings: locales[locale].localeStrings
      };
      existingOpts = this.data("pivotUIOptions");
      if ((existingOpts == null) || overwrite) {
        opts = $.extend(defaults, inputOpts);
      } else {
        opts = existingOpts;
      }
      try {
        input = PivotData.convertToArray(input);
        tblCols = (function() {
          var ref, results;
          ref = input[0];
          results = [];
          for (k in ref) {
            if (!hasProp.call(ref, k)) continue;
            results.push(k);
          }
          return results;
        })();
        ref = opts.derivedAttributes;
        for (c in ref) {
          if (!hasProp.call(ref, c)) continue;
          if ((indexOf.call(tblCols, c) < 0)) {
            tblCols.push(c);
          }
        }
        axisValues = {};
        for (l = 0, len1 = tblCols.length; l < len1; l++) {
          x = tblCols[l];
          axisValues[x] = {};
        }
        PivotData.forEachRecord(input, opts.derivedAttributes, function(record) {
          var base, results, v;
          results = [];
          for (k in record) {
            if (!hasProp.call(record, k)) continue;
            v = record[k];
            if (!(opts.filter(record))) {
              continue;
            }
            if (v == null) {
              v = "null";
            }
            if ((base = axisValues[k])[v] == null) {
              base[v] = 0;
            }
            results.push(axisValues[k][v]++);
          }
          return results;
        });
        uiTable = $("<table>").attr("cellpadding", 5);
        rendererControl = $("<td>");
        renderer = $("<select>").addClass('pvtRenderer').appendTo(rendererControl).bind("change", function() {
          return refresh();
        });
        ref1 = opts.renderers;
        for (x in ref1) {
          if (!hasProp.call(ref1, x)) continue;
          $("<option>").val(x).html(x).appendTo(renderer);
        }
        colList = $("<td>").addClass('pvtAxisContainer pvtUnused');
        shownAttributes = (function() {
          var len2, n, results;
          results = [];
          for (n = 0, len2 = tblCols.length; n < len2; n++) {
            c = tblCols[n];
            if (indexOf.call(opts.hiddenAttributes, c) < 0) {
              results.push(c);
            }
          }
          return results;
        })();
        unusedAttrsVerticalAutoOverride = false;
        if (opts.unusedAttrsVertical === "auto") {
          attrLength = 0;
          for (n = 0, len2 = shownAttributes.length; n < len2; n++) {
            a = shownAttributes[n];
            attrLength += a.length;
          }
          unusedAttrsVerticalAutoOverride = attrLength > 120;
        }
        if (opts.unusedAttrsVertical === true || unusedAttrsVerticalAutoOverride) {
          colList.addClass('pvtVertList');
        } else {
          colList.addClass('pvtHorizList');
        }
        fn = function(c) {
          var attrElem, btns, checkContainer, filterItem, filterItemExcluded, hasExcludedItem, keys, len3, o, ref2, showFilterList, triangleLink, updateFilter, v, valueList;
          keys = (function() {
            var results;
            results = [];
            for (k in axisValues[c]) {
              results.push(k);
            }
            return results;
          })();
          hasExcludedItem = false;
          valueList = $("<div>").addClass('pvtFilterBox').hide();
          valueList.append($("<h4>").text(c + " (" + keys.length + ")"));
          if (keys.length > opts.menuLimit) {
            valueList.append($("<p>").html(opts.localeStrings.tooMany));
          } else {
            btns = $("<p>").appendTo(valueList);
            btns.append($("<button>", {
              type: "button"
            }).html(opts.localeStrings.selectAll).bind("click", function() {
              return valueList.find("input:visible").prop("checked", true);
            }));
            btns.append($("<button>", {
              type: "button"
            }).html(opts.localeStrings.selectNone).bind("click", function() {
              return valueList.find("input:visible").prop("checked", false);
            }));
            btns.append($("<input>", {
              type: "text",
              placeholder: opts.localeStrings.filterResults,
              "class": "pvtSearch"
            }).bind("keyup", function() {
              var filter;
              filter = $(this).val().toLowerCase();
              return valueList.find('.pvtCheckContainer p').each(function() {
                var testString;
                testString = $(this).text().toLowerCase().indexOf(filter);
                if (testString !== -1) {
                  return $(this).show();
                } else {
                  return $(this).hide();
                }
              });
            }));
            checkContainer = $("<div>").addClass("pvtCheckContainer").appendTo(valueList);
            ref2 = keys.sort(naturalSort);
            for (o = 0, len3 = ref2.length; o < len3; o++) {
              k = ref2[o];
              v = axisValues[c][k];
              filterItem = $("<label>");
              filterItemExcluded = opts.exclusions[c] ? (indexOf.call(opts.exclusions[c], k) >= 0) : false;
              hasExcludedItem || (hasExcludedItem = filterItemExcluded);
              $("<input>").attr("type", "checkbox").addClass('pvtFilter').attr("checked", !filterItemExcluded).data("filter", [c, k]).appendTo(filterItem);
              filterItem.append($("<span>").html(k));
              filterItem.append($("<span>").text(" (" + v + ")"));
              checkContainer.append($("<p>").append(filterItem));
            }
          }
          updateFilter = function() {
            var unselectedCount;
            unselectedCount = valueList.find("[type='checkbox']").length - valueList.find("[type='checkbox']:checked").length;
            if (unselectedCount > 0) {
              attrElem.addClass("pvtFilteredAttribute");
            } else {
              attrElem.removeClass("pvtFilteredAttribute");
            }
            if (keys.length > opts.menuLimit) {
              return valueList.toggle();
            } else {
              return valueList.toggle(0, refresh);
            }
          };
          $("<p>").appendTo(valueList).append($("<button>", {
            type: "button"
          }).text("OK").bind("click", updateFilter));
          showFilterList = function(e) {
            valueList.css({
              left: e.pageX,
              top: e.pageY
            }).toggle();
            valueList.find('.pvtSearch').val('');
            return valueList.find('.pvtCheckContainer p').show();
          };
          triangleLink = $("<span>").addClass('pvtTriangle').html(" &#x25BE;").bind("click", showFilterList);
          attrElem = $("<li>").addClass("axis_" + i).append($("<span>").addClass('pvtAttr').text(c).data("attrName", c).append(triangleLink));
          if (hasExcludedItem) {
            attrElem.addClass('pvtFilteredAttribute');
          }
          colList.append(attrElem).append(valueList);
          return attrElem.bind("dblclick", showFilterList);
        };
        for (i in shownAttributes) {
          c = shownAttributes[i];
          fn(c);
        }
        tr1 = $("<tr>").appendTo(uiTable);
        aggregator = $("<select>").addClass('pvtAggregator').bind("change", function() {
          return refresh();
        });
        ref2 = opts.aggregators;
        for (x in ref2) {
          if (!hasProp.call(ref2, x)) continue;
          aggregator.append($("<option>").val(x).html(x));
        }
        $("<td>").addClass('pvtVals').appendTo(tr1).append(aggregator).append($("<br>"));
        $("<td>").addClass('pvtAxisContainer pvtHorizList pvtCols').appendTo(tr1);
        tr2 = $("<tr>").appendTo(uiTable);
        tr2.append($("<td>").addClass('pvtAxisContainer pvtRows').attr("valign", "top"));
        pivotTable = $("<td>").attr("valign", "top").addClass('pvtRendererArea').appendTo(tr2);
        if (opts.unusedAttrsVertical === true || unusedAttrsVerticalAutoOverride) {
          uiTable.find('tr:nth-child(1)').prepend(rendererControl);
          uiTable.find('tr:nth-child(2)').prepend(colList);
        } else {
          uiTable.prepend($("<tr>").append(rendererControl).append(colList));
        }
        this.html(uiTable);
        ref3 = opts.cols;
        for (o = 0, len3 = ref3.length; o < len3; o++) {
          x = ref3[o];
          this.find(".pvtCols").append(this.find(".axis_" + ($.inArray(x, shownAttributes))));
        }
        ref4 = opts.rows;
        for (q = 0, len4 = ref4.length; q < len4; q++) {
          x = ref4[q];
          this.find(".pvtRows").append(this.find(".axis_" + ($.inArray(x, shownAttributes))));
        }
        if (opts.aggregatorName != null) {
          this.find(".pvtAggregator").val(opts.aggregatorName);
        }
        if (opts.rendererName != null) {
          this.find(".pvtRenderer").val(opts.rendererName);
        }
        initialRender = true;
        valSel = [];
        valOrg = [];
        refreshDelayed = (function(_this) {
          return function() {
            var attr, exclusions, len5, natSort, newDropdown, numInputsToProcess, pivotUIOptions, pvtVals, ref5, ref6, s, subopts, t, unusedAttrsContainer, v, vals;
            subopts = {
              derivedAttributes: opts.derivedAttributes,
              localeStrings: opts.localeStrings,
              rendererOptions: opts.rendererOptions,
              cols: [],
              rows: []
            };
            numInputsToProcess = (ref5 = opts.aggregators[aggregator.val()]([])().numInputs) != null ? ref5 : 0;
            vals = [];
            _this.find(".pvtRows li span.pvtAttr").each(function() {
              return subopts.rows.push($(this).data("attrName"));
            });
            _this.find(".pvtCols li span.pvtAttr").each(function() {
              return subopts.cols.push($(this).data("attrName"));
            });
            _this.find(".pvtVals select.pvtAttrDropdown").each(function() {
              if (numInputsToProcess === 0) {
                return $(this).remove();
              } else {
                numInputsToProcess--;
                if ($(this).val() !== "") {
                  return vals.push($(this).val());
                }
              }
            });
            if (numInputsToProcess !== 0) {
              pvtVals = _this.find(".pvtVals");
              for (x = s = 0, ref6 = numInputsToProcess; 0 <= ref6 ? s < ref6 : s > ref6; x = 0 <= ref6 ? ++s : --s) {
                newDropdown = $("<select>").addClass('pvtAttrDropdown').append($("<option>")).bind("change", function() {
                  return refresh();
                });
                for (t = 0, len5 = shownAttributes.length; t < len5; t++) {
                  attr = shownAttributes[t];
                  newDropdown.append($("<option>").val(attr).text(attr));
                }
                pvtVals.append(newDropdown);
              }
            }
            vals = void 0;
            if (opts.aggregatorName !== null && opts.aggregatorName === 'MFSum') {
              if (initialRender) {
                valSel = opts.vals;
                valOrg = opts.vals;
              } else {
                opts.vals = valOrg;
              }
              vals = valSel;
              pvtVals = _this.find('.pvtVals');
              newDropdown = $('<select>').addClass('pvtAttrDropdown').attr('multiple', true).bind('change', function() {
                valSel = $(this).val();
                return refresh();
              });
              for (v in opts.vals) {
                attr = opts.vals[v];
                x = false;
                if (valSel.indexOf(attr) !== -1) {
                  x = true;
                }
                newDropdown.append($('<option>').val(attr).text(attr).prop('selected', x));
              }
              pvtVals.append(newDropdown);
            }
            if (initialRender) {
              i = 0;
              if (opts.aggregatorName !== 'MFSum') {
                _this.find(".pvtVals select.pvtAttrDropdown").each(function() {
                  $(this).val(vals[i]);
                  return i++;
                });
              }
              initialRender = false;
            }
            subopts.aggregatorName = aggregator.val();
            subopts.vals = vals;
            subopts.aggregator = opts.aggregators[aggregator.val()](vals);
            subopts.renderer = opts.renderers[renderer.val()];
            exclusions = {};
            _this.find('input.pvtFilter').not(':checked').each(function() {
              var filter;
              filter = $(this).data("filter");
              if (exclusions[filter[0]] != null) {
                return exclusions[filter[0]].push(filter[1]);
              } else {
                return exclusions[filter[0]] = [filter[1]];
              }
            });
            subopts.filter = function(record) {
              var excludedItems, ref7;
              if (!opts.filter(record)) {
                return false;
              }
              for (k in exclusions) {
                excludedItems = exclusions[k];
                if (ref7 = "" + record[k], indexOf.call(excludedItems, ref7) >= 0) {
                  return false;
                }
              }
              return true;
            };
            pivotTable.pivot(input, subopts);
            pivotUIOptions = $.extend(opts, {
              cols: subopts.cols,
              rows: subopts.rows,
              vals: vals,
              exclusions: exclusions,
              aggregatorName: aggregator.val(),
              rendererName: renderer.val()
            });
            _this.data("pivotUIOptions", pivotUIOptions);
            if (opts.autoSortUnusedAttrs) {
              natSort = $.pivotUtilities.naturalSort;
              unusedAttrsContainer = _this.find("td.pvtUnused.pvtAxisContainer");
              $(unusedAttrsContainer).children("li").sort(function(a, b) {
                return natSort($(a).text(), $(b).text());
              }).appendTo(unusedAttrsContainer);
            }
            pivotTable.css("opacity", 1);
            if (opts.onRefresh != null) {
              return opts.onRefresh(pivotUIOptions);
            }
          };
        })(this);
        refresh = (function(_this) {
          return function() {
            pivotTable.css("opacity", 0.5);
            return setTimeout(refreshDelayed, 10);
          };
        })(this);
        refresh();
        this.find(".pvtAxisContainer").sortable({
          update: function(e, ui) {
            if (ui.sender == null) {
              return refresh();
            }
          },
          connectWith: this.find(".pvtAxisContainer"),
          items: 'li',
          placeholder: 'pvtPlaceholder'
        });
      } catch (error) {
        e = error;
        if (typeof console !== "undefined" && console !== null) {
          console.error(e.stack);
        }
        this.html(opts.localeStrings.uiRenderError);
      }
      return this;
    };

    /*
    Heatmap post-processing
     */
    $.fn.heatmap = function(scope) {
      var colorGen, heatmapper, i, j, l, n, numCols, numRows, ref, ref1;
      if (scope == null) {
        scope = "heatmap";
      }
      numRows = this.data("numrows");
      numCols = this.data("numcols");
      colorGen = function(color, min, max) {
        var hexGen;
        hexGen = (function() {
          switch (color) {
            case "red":
              return function(hex) {
                return "ff" + hex + hex;
              };
            case "green":
              return function(hex) {
                return hex + "ff" + hex;
              };
            case "blue":
              return function(hex) {
                return "" + hex + hex + "ff";
              };
          }
        })();
        return function(x) {
          var hex, intensity;
          intensity = 255 - Math.round(255 * (x - min) / (max - min));
          hex = intensity.toString(16).split(".")[0];
          if (hex.length === 1) {
            hex = 0 + hex;
          }
          return hexGen(hex);
        };
      };
      heatmapper = (function(_this) {
        return function(scope, color) {
          var colorFor, forEachCell, values;
          forEachCell = function(f) {
            return _this.find(scope).each(function() {
              var x;
              x = $(this).data("value");
              if ((x != null) && isFinite(x)) {
                return f(x, $(this));
              }
            });
          };
          values = [];
          forEachCell(function(x) {
            return values.push(x);
          });
          colorFor = colorGen(color, Math.min.apply(Math, values), Math.max.apply(Math, values));
          return forEachCell(function(x, elem) {
            return elem.css("background-color", "#" + colorFor(x));
          });
        };
      })(this);
      switch (scope) {
        case "heatmap":
          heatmapper(".pvtVal", "red");
          break;
        case "rowheatmap":
          for (i = l = 0, ref = numRows; 0 <= ref ? l < ref : l > ref; i = 0 <= ref ? ++l : --l) {
            heatmapper(".pvtVal.row" + i, "red");
          }
          break;
        case "colheatmap":
          for (j = n = 0, ref1 = numCols; 0 <= ref1 ? n < ref1 : n > ref1; j = 0 <= ref1 ? ++n : --n) {
            heatmapper(".pvtVal.col" + j, "red");
          }
      }
      heatmapper(".pvtTotal.rowTotal", "red");
      heatmapper(".pvtTotal.colTotal", "red");
      return this;
    };

    /*
    Barchart post-processing
     */
    return $.fn.barchart = function() {
      var barcharter, i, l, numCols, numRows, ref;
      numRows = this.data("numrows");
      numCols = this.data("numcols");
      barcharter = (function(_this) {
        return function(scope) {
          var forEachCell, max, scaler, values;
          forEachCell = function(f) {
            return _this.find(scope).each(function() {
              var x;
              x = $(this).data("value");
              if ((x != null) && isFinite(x)) {
                return f(x, $(this));
              }
            });
          };
          values = [];
          forEachCell(function(x) {
            return values.push(x);
          });
          max = Math.max.apply(Math, values);
          scaler = function(x) {
            return 100 * x / (1.4 * max);
          };
          return forEachCell(function(x, elem) {
            var text, wrapper;
            text = elem.text();
            wrapper = $("<div>").css({
              "position": "relative",
              "height": "55px"
            });
            wrapper.append($("<div>").css({
              "position": "absolute",
              "bottom": 0,
              "left": 0,
              "right": 0,
              "height": scaler(x) + "%",
              "background-color": "gray"
            }));
            wrapper.append($("<div>").text(text).css({
              "position": "relative",
              "padding-left": "5px",
              "padding-right": "5px"
            }));
            return elem.css({
              "padding": 0,
              "padding-top": "5px",
              "text-align": "center"
            }).html(wrapper);
          });
        };
      })(this);
      for (i = l = 0, ref = numRows; 0 <= ref ? l < ref : l > ref; i = 0 <= ref ? ++l : --l) {
        barcharter(".pvtVal.row" + i);
      }
      barcharter(".pvtTotal.colTotal");
      return this;
    };
  });

}).call(this);

//# sourceMappingURL=pivot.js.map