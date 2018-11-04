$(function(){
    $("#btnCopyToClipboard").click(function(){
        $("#outputCIDRs").select();
        document.execCommand('copy');
    });

    class Ip {
        
        constructor(ip) {
            this.ip = ip;
            this.bucket_n = 0;
            update_ip_mask();
        };
        
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
            // Updates this.ip_mask
        set bucket_n(ip_instances) {
            this.bucket_n = ip_instances;
            update_ip_mask;
        };
        
        bucket_capacity() {
            2**(32 - this.bucket_n)
        };
        
        update_ip_mask() {
            ip_array = this.ip.split(".").map {|s| s.to_i}    
            mask_ip_array = Ip.get_mask_ip_array(this.bucket_n)
            this.ip_mask = Ip.get_cidr_ip(ip_array, mask_ip_array)
        };
        
        get_mask_ip_array(n) {
            length = 0
            number_of_masked_bits = 0
            mask_ip_array = []
            32.times do
                n -= 1
                length += 1
                if n >= 0
                    number_of_masked_bits += 1
                end
                if length > 7
                  //  mask_ip_array << number_of_masked_bits
                    number_of_masked_bits = 0
                    length = 0
                end
            end
            return mask_ip_array.map {|n| 256-(2**(8-n))}
        };
        
        get_cidr_ip(ip_array, mask_ip_array) {
            index = 0
            cidr_array = []
            4.times do
                //cidr_array << (ip_array[index] & mask_ip_array[index])
                index += 1
            end
            cidr_array.join(".")
        };
    };

    function get_cidr_rules_from_file() {
        var max_holes_per_bucket = 0;
        // change
        var contents = File.read('ips.txt');
        var ip_strings = contents.split("\n");
        var max_holes_per_bucket = parsInt(ip_strings.shift(), 10);
        get_cidr_rules_from_ip_strings(ip_strings, max_holes_per_bucket);
    };

    function get_cidr_rules_from_ip_strings(ip_strings, max_holes_per_bucket) {
        var uniqeIPs = _.uniq(ip_strings);
        var ips = _.map(uniqeIPs, function(ip_string) { return new Ip(ip_string) });
        var ip_mask_hash = {};
        _.each(ips, function(ip_instance) {
            if (ip_mask_hash[ip_instance.ip_mask] === undefined) ip_mask_hash[ip_instance.ip_mask] = [];
            ip_mask_hash[ip_instance.ip_mask] << ip_instance;
        });
        get_cidr_rules_from_ip_mask_hash(ip_mask_hash, max_holes_per_bucket);
    };
    
    function get_cidr_rules_from_ip_mask_hash(ip_mask_hash, max_holes_per_bucket) {
        var buckets_are_full = true;
        var new_ip_mask_hash = {};

        _.each(ip_mask_hash, function(ip_instances, _){
            if (ip_instances.length < ip_instances[0].bucket_capacity - max_holes_per_bucket) {
                                                        // Updates this.ip_mask
                _.each(ip_instances, function(ip_instance) { ip_instance.bucket_n += 1 });
                buckets_are_full = false;
            }
            _.each(ip_instances, function(ip_instance)  {
                if (new_ip_mask_hash[ip_instance.ip_mask] === undefined) new_ip_mask_hash[ip_instance.ip_mask] = [];
                new_ip_mask_hash[ip_instance.ip_mask] << ip_instance
            });
        }) 
        if (!buckets_are_full) return get_cidr_rules_from_ip_mask_hash(new_ip_mask_hash, max_holes_per_bucket);
        return get_collapsed_cidr_rules_from_new_ip_mask_hash(new_ip_mask_hash);
    };
    
    function get_collapsed_cidr_rules_from_new_ip_mask_hash(new_ip_mask_hash) {this.
        complete_hash = {};
        _.each(new_ip_mask_hash, function(ip_instances, _) {
            improved_n = self.collapse(ip_instances);
            _.each(ip_instances, function(ip_instance) {
                    // Updates @ip_mask
                ip_instance.bucket_n = improved_n;
                if (complete_hash[ip_instance.ip_mask] === undefined) complete_hash[ip_instance.ip_mask] = [];
                complete_hash[ip_instance.ip_mask] << ip_instance;
            });
        });
        
        cidr_rules = [];
        _.each(complete_hash, function(ip_instances, ip_mask){ cidr_rules << "#{ip_mask}/#{ip_instances[0].bucket_n}"; });
        return cidr_rules;
    };

    function collapse(ip_instances) {this.
        _.each(ip_instances, function(ip_instance) {
                // Updates @ip_mask
            ip_instance.bucket_n = 32;
        });
        while(true) {
            ip_mask_hash = {}
            _.each(ip_instances, function(ip_instance) {
                if (ip_mask_hash[ip_instance.ip_mask] === undefined) ip_mask_hash[ip_instance.ip_mask] = [];
                ip_mask_hash[ip_instance.ip_mask] << ip_instance;
            });
            if (ip_mask_hash.keys.length == 1) break 
            _.each(ip_instances, function(ip_instance) {
                    // Updates @ip_mask                
                ip_instance.bucket_n -= 1;
            });
        };
        ip_instances[0].bucket_n;
    };

    get_cidr_rules_from_file()
});