
$(function(){
    $("#btnUpload").click(function(){
        var ip_array = get_cidr_rules_from_file();
        $("#outputCIDRs").val(ip_array.join("\n"));
    });
    $("#btnCopyToClipboard").click(function(){
        $("#outputCIDRs").select();
        document.execCommand('copy');
    })
    
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

    function get_cidr_rules_from_file() {
        var max_holes_per_bucket = 0;
        var contents = $("#inputCIDRs").val()
        var ip_strings = contents.split("\n");
        // var max_holes_per_bucket = f(slider)
        var output = get_cidr_rules_from_ip_strings(ip_strings, max_holes_per_bucket);
        return output;
    }

    function get_cidr_rules_from_ip_strings(ip_strings, max_holes_per_bucket) {
        var uniqeIPs = _.uniq(ip_strings);
        var ips = _.map(uniqeIPs, function(ip_string) { return new Ip(ip_string) });
        var ip_mask_hash = {};
        _.each(ips, function(ip_instance) {
            if (ip_mask_hash[ip_instance.ip_mask] === undefined) ip_mask_hash[ip_instance.ip_mask] = [];
            ip_mask_hash[ip_instance.ip_mask].push(ip_instance);
        });
        return get_cidr_rules_from_ip_mask_hash(ip_mask_hash, max_holes_per_bucket);
    }
    
    function get_cidr_rules_from_ip_mask_hash(ip_mask_hash, max_holes_per_bucket) {
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
        if (!buckets_are_full) return get_cidr_rules_from_ip_mask_hash(new_ip_mask_hash, max_holes_per_bucket);
        return get_collapsed_cidr_rules_from_new_ip_mask_hash(new_ip_mask_hash);
    }
    
    function get_collapsed_cidr_rules_from_new_ip_mask_hash(new_ip_mask_hash) {
        complete_hash = {};
        _.each(new_ip_mask_hash, function(ip_instances) {
            improved_n = collapse(ip_instances);
            _.each(ip_instances, function(ip_instance) {
                    // Updates @ip_mask
                ip_instance.bucket_n = improved_n;
                if (complete_hash[ip_instance.ip_mask] === undefined) complete_hash[ip_instance.ip_mask] = [];
                complete_hash[ip_instance.ip_mask].push(ip_instance);
            })
        })
        
        var cidr_rules = [];
        _.each(complete_hash, (ip_instances, ip_mask) => cidr_rules.push("" + ip_mask + "/" + ip_instances[0].bucket_n));
        return cidr_rules;
    }

    function collapse(ip_instances) {
        _.each(ip_instances, function(ip_instance) {
                // Updates @ip_mask
            ip_instance.bucket_n = 32;
        })
        while(true) {
            ip_mask_hash = {}
            _.each(ip_instances, function(ip_instance) {
                if (ip_mask_hash[ip_instance.ip_mask] === undefined) ip_mask_hash[ip_instance.ip_mask] = [];
                ip_mask_hash[ip_instance.ip_mask] << ip_instance;
            })
            if (_.keys(ip_mask_hash).length == 1) break 
            _.each(ip_instances, function(ip_instance) {
                    // Updates @ip_mask                
                ip_instance.bucket_n -= 1;
            })
        }
        return ip_instances[0].bucket_n;
    }

})
