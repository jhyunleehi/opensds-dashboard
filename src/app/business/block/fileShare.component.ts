import { Router,ActivatedRoute } from '@angular/router';
import { Component, OnInit, ViewContainerRef, ViewChild, Directive, ElementRef, HostBinding, HostListener, Input } from '@angular/core';
import { I18NService, MsgBoxService, HttpService, Utils } from 'app/shared/api';
import { ConfirmationService, ConfirmDialogModule, MenuItem, Message} from '../../components/common/api';
import { trigger, state, style, transition, animate} from '@angular/animations';
import { I18nPluralPipe } from '@angular/common';
import { FormGroup, Validators, FormBuilder, FormControl } from '@angular/forms';
import { FileShareService, SnapshotService, FileShareAclService } from './fileShare.service';
import { ProfileService } from './../profile/profile.service';

let _ = require("underscore");
@Component({
    selector: 'app-file-share',
    templateUrl: './fileShare.component.html',
    styleUrls: [],
    providers: [ConfirmationService, MsgBoxService ]
})
export class FileShareComponent implements OnInit{
    selectedFileShares = [];
    createSnapshotShow = false;
    modifyFileShareShow = false;
    createSnapshotForm;
    createAclsFormGroup;
    errorMessage = {
        "level": { required: "Access Level is required." },
        "user": { required: "Ip/User is required." },
        "name":  {required: "Name is required.", isExisted: "Name is existing." },
        "userInput":{required: "Ip/User is required"},
        "accessCapability": { required: "Access Level is required." }
    }
    selectedFileShare;
    modifyFileShareForm;
    fileShares = [];
    profiles = [];
    showCreateSnapshot = true;
    aclCreateShow = false;
    aclsItems = [0];
    acls =[];
    availabilityAclLevel;
    availabilityip;
    menuItems: MenuItem[];
    menuDeleDisableItems : MenuItem[];
    msgs: Message[];
    allFileShareNameForCheck = [];

    constructor(
        private ActivatedRoute: ActivatedRoute,
        public I18N:I18NService,
        private http: HttpService,
        private fb: FormBuilder,
        private msg: MsgBoxService,
        private FileShareService: FileShareService,
        private ProfileService: ProfileService,
        private SnapshotService: SnapshotService,
        private confirmationService: ConfirmationService,
        private FileShareAclService: FileShareAclService
    ){
        this.createSnapshotForm = this.fb.group({
            "name": ["",Validators.required],
            "description": ["", Validators.maxLength(200)]
        })
    }
    ngOnInit(){
        this.availabilityAclLevel =[
            {label: "Read", value: "Read"},
            {label: "Write", value: "Write"},
            {label: "Execute", value: "Execute"}
        ];
        this.availabilityip =[
            {label: "ip", value: "ip"},
            // {label: "user", value: "user"}
        ]
        this.menuDeleDisableItems = [
            {
                "label": this.I18N.keyID['sds_block_volume_modify'],
                command: () => {
                    this.modifyFileShareShow = true;
                    this.getFileShares('modify',this.selectedFileShare.name);
                    this.modifyFileShareForm = this.fb.group({
                        "name": [this.selectedFileShare.name,{ validators: [Validators.required, Utils.isExisted(this.allFileShareNameForCheck)], updateOn: 'change' }],
                        "description": [this.selectedFileShare.description, Validators.maxLength(200)]
                    })
                },
                disabled:false
            },
            {
                "label": this.I18N.keyID['sds_block_volume_delete'],
                command: () => {
                    this.batchDelete(this.selectedFileShare);
                },
                disabled:false
            }
        ];
        this.menuItems = [
            {
                "label": this.I18N.keyID['sds_block_volume_modify'],
                command: () => {
                    this.modifyFileShareShow = true;
                    this.getFileShares('modify',this.selectedFileShare.name);
                    this.modifyFileShareForm = this.fb.group({
                        "name": [this.selectedFileShare.name,{ validators: [Validators.required, Utils.isExisted(this.allFileShareNameForCheck)], updateOn: 'change' }],
                        "description": [this.selectedFileShare.description, Validators.maxLength(200)]
                    })
                },
                disabled:false
            },
            {
                "label": this.I18N.keyID['sds_block_volume_delete'],
                command: () => {
                    this.batchDelete(this.selectedFileShare);
                },
                disabled:false
            }
        ];
        this.getProfile();
    }
    getFileShares(dialog?,selectedFileName?){
        this.FileShareService.getFileShare().subscribe((res)=>{
            this.fileShares = res.json();
            this.fileShares.map(item=>{
                let _profile = this.profiles.filter(profile=>{
                    return profile.id == item.profileId;
                })[0];
                item['profileName'] = _profile != undefined ? _profile.name : '--';
                item.size = Utils.getDisplayGBCapacity(item.size);
            })
            if(dialog){
                this.fileShares.forEach(item=>{
                    if(item.name != this.selectedFileShare.name){
                        this.allFileShareNameForCheck.push(item.name);
                    }
                })
            }else{
                this.selectedFileShares = [];
            }
        })
    }
    getProfile(){
        this.ProfileService.getProfiles().subscribe((res) => {
            this.profiles = res.json();

            this.getFileShares();
        });
    }
    returnSelectedFileShare(selectedFileShare, dialog){
        if(dialog == 'snapshot'){
            this.createSnapshotShow = true;
            this.createSnapshotForm.reset();
        }else if(dialog == 'acl'){
            this.aclCreateShow = true;
            this.createAclsFormGroup = this.fb.group({
                "level":  ["", Validators.required],
                "user":  ["ip", Validators.required],
                "userInput0": ["", Validators.required],
                "description": [""]
            })
        }
        this.selectedFileShare = selectedFileShare;
    }
    modifyFileShare(value){
        if (!this.modifyFileShareForm.valid) {
            for (let i in this.modifyFileShareForm.controls) {
                this.modifyFileShareForm.controls[i].markAsTouched();
            }
            return;
        };
        let dataArr = value;
        this.FileShareService.updateFileShare(this.selectedFileShare.id,dataArr).subscribe((res)=>{
            this.getFileShares();
            this.modifyFileShareShow = false;
        })
    }
    batchDelete(fileShare){
        if(fileShare){
            let  msg, arr = [];
            if(_.isArray(fileShare)){
                fileShare.forEach((item,index)=> {
                    arr.push(item.id);
                })
                msg = "<div>Are you sure you want to delete the selected FileShare?</div><h3>[ "+ fileShare.length +" FileShare ]</h3>";
            }else{
                arr.push(fileShare.id)
                msg = "<div>Are you sure you want to delete the selected FileShare?</div><h3>[ "+ fileShare.name +" ]</h3>"; 
            }
            this.confirmationService.confirm({
                message: msg,
                header: this.I18N.keyID['sds_fileShare_delete'],
                acceptLabel: this.I18N.keyID['sds_block_volume_delete'],
                isWarning: true,
                accept: ()=>{
                    arr.forEach((item,index)=> {
                        this.deleteFileShare(item)
                    })
                },
                reject:()=>{}
            })
        }
    }
    deleteFileShare(fileShare){
        this.SnapshotService.getSnapshot().subscribe(res=>{
            let snapShot = res.json();
            snapShot = snapShot.filter(item=>{
                return item.fileshareId == fileShare;
            })
            if(snapShot.length != 0){
                let overHeadMsg = "<div>Fileshare contains snapshot. To remove fileshare, please remove snapshot first</div>";
                this.msgs = [];
                this.msgs.push({severity: 'error', summary: 'Error', detail: overHeadMsg});
            }else{
                this.FileShareAclService.getFileShareAcl().subscribe(res=>{
                    let acls = res.json();
                    acls = acls.filter(item=>{
                        return item.fileshareId == fileShare;
                    })
                    if(acls.length != 0){
                        let  overHeadMsg = "<div>Fileshare contains access. To remove fileshare, please remove access first</div>";
                        this.msgs = [];
                        this.msgs.push({severity: 'error', summary: 'Error', detail: overHeadMsg});
                    }else{
                        this.FileShareService.deleteFileShare(fileShare).subscribe(res=>{
                            this.getFileShares();
                        })
                    }
                })
            }
        })
    }
    createSnapshot(){
        if(!this.createSnapshotForm.valid){
            for(let i in this.createSnapshotForm.controls){
                this.createSnapshotForm.controls[i].markAsTouched();
            }
            return;
        }
        let value = this.createSnapshotForm.value;
        value.description = value.description != "" ? value.description: "--";
        value.fileshareId = this.selectedFileShare.id;
        
        this.SnapshotService.createSnapshot(value).subscribe((res)=>{
            this.createSnapshotShow = false;
            this.getProfile();
            this.showCreateSnapshot = false;
        },
        err=>{
          this.msgs = [];
          this.msgs.push({severity: 'error', summary: 'Error', detail: err.message});
        })
    }

    addTransRules(){
        this.aclsItems.push(
            this.aclsItems[this.aclsItems.length-1] + 1
          );
          this.aclsItems.forEach(index => {
            if(index !== 0){
            //   this.createAclsFormGroup.addControl('user'+index, this.fb.control("", Validators.required));
              this.createAclsFormGroup.addControl('userInput'+index, this.fb.control("", Validators.required));
            }
        });
    }
    deleteAclUsers(index){
        this.aclsItems.splice(index, 1);
        // this.createAclsFormGroup.removeControl('user'+index);
        this.createAclsFormGroup.removeControl('userInput'+index);
    }
    createAclsSubmit(value){
        if(!this.createAclsFormGroup.valid){
            for(let i in this.createAclsFormGroup.controls){
                this.createAclsFormGroup.controls[i].markAsTouched();
            }
            return;
        }
        let dataArr = this.getAclsDataArray(value);
        for(let i in dataArr){
            this.aclsCreateSubmit(dataArr[i]);
        }
    }
    getAclsDataArray(value){
        let dataArr = [];
        this.aclsItems.forEach(index=>{
            dataArr.push({
                accessCapability: value['level'],
                type: value['user'],
                accessTo: value['userInput'+index]
            })
        })
        return dataArr;
    }
    aclsCreateSubmit(param){
        param['fileshareId'] = this.selectedFileShare.id;
        this.FileShareAclService.createFileShareAcl(param,this.selectedFileShare.id).subscribe((res)=>{
            this.getProfile();
            this.aclCreateShow = false;
        })
    }
}