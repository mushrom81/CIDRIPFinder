
$(function(){
    
    $("#btnCopyToClipboard").click(function(){
        $("#outputCIDRs").select();
        document.execCommand('copy');
    });
    
    $("#inputCIDRs").blur(function(){
        var ip_array = get_cidr_rules_from_file();
        $("#outputCIDRs").val(ip_array.join("\n"));
        $("#holes").val(holes.toString());
    });
    
    setInterval(function(){
        if ($("#inputCIDRs").is(':focus')) {}
        else {
            var ip_array = get_cidr_rules_from_file();
            $("#outputCIDRs").val(ip_array.join("\n"));
            $("#holes").val(holes.toString());
        }
    }, 1000);
    
    var errorDiv = $("#errorDiv");
    var outputHoles = $("#holes");
    var outputTextarea = $("#outputCIDRs");
    var holes = 0;

    class Ip {
        constructor(ip) {
            this._ip = ip;
            this._bucket_n = 0;
            this.update_ip_mask();
        }
        
        get ip() {
            return this._ip;
        }
        set ip(value) {
            this._ip = value;
        }
        get ip_mask() {
            return this._ip_mask;
        }
        set ip_mask(value) {
            this._ip_mask = value;
        }
        get bucket_n() {
            return this._bucket_n;
        }
            // Updates ip_mask
        set bucket_n(ip_instances) {
            this._bucket_n = ip_instances;
            this.update_ip_mask();
        }
        
        get bucket_capacity() {
            return 2**(32 - this._bucket_n);
        }
        
        update_ip_mask() {
            var ip_array = _.map(this._ip.split("."), s => parseInt(s));
            var mask_ip_array = this.get_mask_ip_array(this._bucket_n);
            this._ip_mask = this.get_cidr_ip(ip_array, mask_ip_array);
        }
        
        get_mask_ip_array(n) {
            var length = 0
            var number_of_masked_bits = 0
            var mask_ip_array = []
            for (var i=0; i < 32; i++) {
                n -= 1;
                length++;
                if (n >= 0) {
                    number_of_masked_bits++;
                }
                if (length > 7) {
                    mask_ip_array.push(number_of_masked_bits);
                    number_of_masked_bits = 0;
                    length = 0;
                }
            }
            return _.map(mask_ip_array, n => 256-(2**(8-n)));
        }
        
        get_cidr_ip(ip_array, mask_ip_array) {
            var index = 0;
            var cidr_array = [];
            for (var i=0; i < 4; i++) {
                cidr_array.push(ip_array[index] & mask_ip_array[index]);
                index ++;
            }
            return cidr_array.join(".");
        }
    }

    class CIDRRule {
        constructor(cidr_rule) {
            this._cidr_rule = cidr_rule
            this._bucket_n = parseInt(cidr_rule.split("/")[1]);
            this._n = parseInt(cidr_rule.split("/")[1]);
            this._ip = cidr_rule.split("/")[0];
            this.update_ip_mask();
        }

        get n() {
            return this._n
        }
        
        set n(value) {
            this._bucket_n = value;
            this.update_ip_mask();
        }
        
        get cidr_rule() {
            return this._cidr_rule
        }

        get ip_mask() {
            return this._ip_mask;
        }

        update_ip_mask() {
            var ip_array = _.map(this._ip.split("."), s => parseInt(s));
            var mask_ip_array = this.get_mask_ip_array(this._bucket_n);
            this._ip_mask = this.get_cidr_ip(ip_array, mask_ip_array);
        }
        
        get_mask_ip_array(n) {
            var length = 0
            var number_of_masked_bits = 0
            var mask_ip_array = []
            for (var i=0; i < 32; i++) {
                n -= 1;
                length++;
                if (n >= 0) {
                    number_of_masked_bits++;
                }
                if (length > 7) {
                    mask_ip_array.push(number_of_masked_bits);
                    number_of_masked_bits = 0;
                    length = 0;
                }
            }
            return _.map(mask_ip_array, n => 256-(2**(8-n)));
        }
        
        get_cidr_ip(ip_array, mask_ip_array) {
            var index = 0;
            var cidr_array = [];
            for (var i=0; i < 4; i++) {
                cidr_array.push(ip_array[index] & mask_ip_array[index]);
                index ++;
            }
            return cidr_array;
        }

    }

    function get_cidr_rules_from_file() {
        holes = 0;
        var max_holes_per_bucket = $("#sliderHoles").val();
        var contents = $("#inputCIDRs").val()    
        if (!contents) { contents = "0.0.0.0" }
        var ip_strings = contents.split("\n");
        ip_strings = ip_strings.join(",");
        ip_strings = ip_strings.split(",");
        var input_cidr_rules = [];
        _.each(ip_strings, function(ip_string) {
            if (ip_string.indexOf("/") > -1) {
                input_cidr_rules.push(ip_string);
            }
        });
        _.each(input_cidr_rules, function(cidr_rule){
            ip_strings.splice(ip_strings.indexOf(cidr_rule), 1);
        });
        var output = get_cidr_rules_from_ip_strings(ip_strings, max_holes_per_bucket, input_cidr_rules);
        return output;
    }

    function get_cidr_rules_from_ip_strings(ip_strings, max_holes_per_bucket, input_cidr_rules) {
        var uniqeIPs = _.uniq(ip_strings);
        var ips = _.map(uniqeIPs, function(ip_string) { return new Ip(ip_string) });
        var ip_mask_hash = {};
        _.each(ips, function(ip_instance) {
            if (ip_mask_hash[ip_instance.ip_mask] === undefined) ip_mask_hash[ip_instance.ip_mask] = [];
            ip_mask_hash[ip_instance.ip_mask].push(ip_instance);
        });
        return get_cidr_rules_from_ip_mask_hash(ip_mask_hash, max_holes_per_bucket, input_cidr_rules);
    }
    
    function get_cidr_rules_from_ip_mask_hash(ip_mask_hash, max_holes_per_bucket, input_cidr_rules) {
        var buckets_are_full = true;
        var new_ip_mask_hash = {};
        _.each(ip_mask_hash, function(ip_instances) {
            if (ip_instances.length < ip_instances[0].bucket_capacity - max_holes_per_bucket) {
                                                                // Updates ip_mask
                _.each(ip_instances, function(ip_instance) { ip_instance.bucket_n += 1 });
                buckets_are_full = false;
            }
            _.each(ip_instances, function(ip_instance)  {
                if (new_ip_mask_hash[ip_instance.ip_mask] === undefined) new_ip_mask_hash[ip_instance.ip_mask] = [];
                new_ip_mask_hash[ip_instance.ip_mask].push(ip_instance);
            })
        }) 
        if (!buckets_are_full) return get_cidr_rules_from_ip_mask_hash(new_ip_mask_hash, max_holes_per_bucket, input_cidr_rules);
        return get_collapsed_cidr_rules_from_new_ip_mask_hash(new_ip_mask_hash, input_cidr_rules);
    }
    
    function get_collapsed_cidr_rules_from_new_ip_mask_hash(new_ip_mask_hash, input_cidr_rules) {
        complete_hash = {};
        _.each(new_ip_mask_hash, function(ip_instances) {
            var improved_n = collapse(ip_instances);
            _.each(ip_instances, function(ip_instance) {
                    // Updates @ip_mask
                ip_instance.bucket_n = improved_n;
                if (complete_hash[ip_instance.ip_mask] === undefined) complete_hash[ip_instance.ip_mask] = [];
                complete_hash[ip_instance.ip_mask].push(ip_instance);
            });
        });
        
        var cidr_rules = input_cidr_rules.slice();
        _.each(complete_hash, (ip_instances, ip_mask) => cidr_rules.push("" + ip_mask + "/" + ip_instances[0].bucket_n));
        cidr_rules = remove_duplicates(cidr_rules);
        if (_.some(cidr_rules, errorCase => errorCase == "0.0.0.0/32")) {
            holes = "N/A";
            cidr_rules = [];
            outputHoles.prop('disabled', true);
            outputTextarea.prop('disabled', true);
            errorDiv.show();
        }
        else {
            outputHoles.prop('disabled', false);
            outputTextarea.prop('disabled', false);
            errorDiv.hide();
        }
        return cidr_rules;
    }
        var cidr_rule_instances;
    function remove_duplicates(cidr_rules) {
        cidr_rule_instances = _.map(cidr_rules, cidr_rule => new CIDRRule(cidr_rule));
        var spliced_cidr_rule_instances;
        for (var i=0; i < cidr_rule_instances.length; i++) {
            spliced_cidr_rule_instances = cidr_rule_instances.slice();
            spliced_cidr_rule_instances.splice(i, 1);
            remove_subsets(cidr_rule_instances[i], spliced_cidr_rule_instances);
        }
        return _.map(cidr_rule_instances, instance => instance.cidr_rule)
    }

    function remove_subsets(ip_instance, ip_instance_array) {
        if (!ip_instance_array) return;
        _.each(ip_instance_array, function(other_ip_instance){
            if (check_if_subset(ip_instance, other_ip_instance)) {
                if (ip_instance.n <= other_ip_instance.n) {
                    cidr_rule_instances.splice(cidr_rule_instances.indexOf(other_ip_instance), 1);                    
                }
            }
        });
    }

    function check_if_subset(ip_instance, other_ip_instance) {
        ip_instance.n = ip_instance.n;
        other_ip_instance.n = other_ip_instance.n;
        if (ip_instance.n < other_ip_instance.n) {
                        // updates ip_mask
            other_ip_instance.n = ip_instance.n;
        }
        else {
                // updates ip_mask
            ip_instance.n = other_ip_instance.n;
        }
        var combined_array = [];
        for (var i=0; i < 4; i++) {
            combined_array.push(ip_instance.ip_mask[i] ^ other_ip_instance.ip_mask[i]);
        }
        if (_.isEqual(combined_array, [0, 0, 0, 0])) { return true; }
        else { return false; }
    }

    function collapse(ip_instances) {
        _.each(ip_instances, function(ip_instance) {
                // Updates @ip_mask
            ip_instance.bucket_n = 32;
        });
        while(true) {
            ip_mask_hash = {}
            _.each(ip_instances, function(ip_instance) {
                if (ip_mask_hash[ip_instance.ip_mask] === undefined) ip_mask_hash[ip_instance.ip_mask] = [];
                ip_mask_hash[ip_instance.ip_mask].push(ip_instance);
            });
            if (_.keys(ip_mask_hash).length == 1) {
                var ips_in_bucket = _.values(ip_mask_hash)[0].length;
                var bucket_size = _.values(ip_mask_hash)[0][0].bucket_capacity;
                holes += (bucket_size - ips_in_bucket);
                break
            } 
            _.each(ip_instances, function(ip_instance) {
                    // Updates @ip_mask                
                ip_instance.bucket_n -= 1;
            });
        }
        return ip_instances[0].bucket_n;
    }
});
